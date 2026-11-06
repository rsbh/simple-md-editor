package main

import (
	"context"
	"errors"
	"os"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	configDirName   = "simple-md-editor"
	recentFileName  = "recent.json"
	maxRecentFiles  = 20
	defaultDocTitle = "Untitled"
)

// Document is a file's contents plus the stamp used to notice that something
// else changed the file while it was open.
type Document struct {
	Path string `json:"path"`
	Text string `json:"text"`
	// ModTime is the file's modification time in Unix nanoseconds at the
	// moment it was read or written.
	ModTime int64 `json:"modTime"`
}

// SaveResult reports either a completed write or a refusal to overwrite a file
// that changed on disk since it was read.
type SaveResult struct {
	Document *Document `json:"document"`
	// Conflict is true when the file changed underneath us and nothing was
	// written. Saving again with expectedModTime of 0 forces the write.
	Conflict bool `json:"conflict"`
}

// RecentFile is one entry in the recently opened list.
type RecentFile struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// App holds the application context and exposes the methods bound to the
// frontend. Every filesystem operation lives here; the frontend never touches
// disk directly.
type App struct {
	ctx context.Context

	recentMu sync.Mutex

	// configDir overrides where the recent list is kept. Empty means the
	// user's own config directory; tests point it somewhere disposable.
	configDir string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

var markdownFilters = []runtime.FileFilter{
	{
		DisplayName: "Markdown",
		Pattern:     "*.md;*.markdown;*.mdown;*.mkd;*.txt",
	},
	{
		DisplayName: "All files",
		Pattern:     "*",
	},
}

// OpenFile asks for a file and reads it. A nil document means the user
// dismissed the dialog, which is not an error.
func (a *App) OpenFile() (*Document, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Open",
		Filters: markdownFilters,
	})
	if err != nil {
		return nil, err
	}
	if path == "" {
		return nil, nil
	}
	return a.ReadFile(path)
}

// ReadFile loads a file by path, for reopening recent files and restoring a
// previous session.
func (a *App) ReadFile(path string) (*Document, error) {
	text, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	modTime, err := modTimeOf(path)
	if err != nil {
		return nil, err
	}
	a.rememberRecent(path)
	return &Document{Path: path, Text: string(text), ModTime: modTime}, nil
}

// SaveFile writes text to a path that is already known.
//
// expectedModTime guards against clobbering a file that something else wrote
// since it was read: pass the stamp the frontend is holding, or 0 to write
// unconditionally.
func (a *App) SaveFile(path string, text string, expectedModTime int64) (*SaveResult, error) {
	if path == "" {
		return nil, errors.New("save: no path")
	}

	if expectedModTime != 0 {
		current, err := modTimeOf(path)
		switch {
		case errors.Is(err, os.ErrNotExist):
			// Deleted underneath us; recreating it is what the user wants.
		case err != nil:
			return nil, err
		case current != expectedModTime:
			return &SaveResult{Conflict: true}, nil
		}
	}

	doc, err := a.writeFile(path, text)
	if err != nil {
		return nil, err
	}
	return &SaveResult{Document: doc}, nil
}

// SaveFileAs asks where to put the text and writes it there. A nil document
// means the user dismissed the dialog.
func (a *App) SaveFileAs(suggestedName string, text string) (*Document, error) {
	if suggestedName == "" {
		suggestedName = defaultDocTitle + ".md"
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save As",
		DefaultFilename: suggestedName,
		Filters:         markdownFilters,
	})
	if err != nil {
		return nil, err
	}
	if path == "" {
		return nil, nil
	}
	return a.writeFile(path, text)
}

// SetWindowTitle lets the frontend keep the window name in step with the
// document, since there is no title bar to read it from.
func (a *App) SetWindowTitle(title string) {
	runtime.WindowSetTitle(a.ctx, title)
}

// Quit closes the application. The window has no controls of its own, so this
// is reachable from the command palette.
func (a *App) Quit() {
	runtime.Quit(a.ctx)
}

// writeFile writes the file and reports the stamp it ended up with.
func (a *App) writeFile(path string, text string) (*Document, error) {
	if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
		return nil, err
	}
	modTime, err := modTimeOf(path)
	if err != nil {
		return nil, err
	}
	a.rememberRecent(path)
	return &Document{Path: path, Text: text, ModTime: modTime}, nil
}

func modTimeOf(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.ModTime().UnixNano(), nil
}
