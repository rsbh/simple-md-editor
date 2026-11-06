package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// RecentFiles lists recently opened files, most recent first. Entries whose
// file has since disappeared are dropped.
func (a *App) RecentFiles() ([]RecentFile, error) {
	a.recentMu.Lock()
	defer a.recentMu.Unlock()

	paths, err := a.readRecent()
	if err != nil {
		return nil, err
	}

	out := make([]RecentFile, 0, len(paths))
	kept := make([]string, 0, len(paths))
	for _, p := range paths {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		kept = append(kept, p)
		out = append(out, RecentFile{Path: p, Name: filepath.Base(p)})
	}

	if len(kept) != len(paths) {
		// Best effort: a failure to prune is not worth failing the read.
		_ = a.writeRecent(kept)
	}
	return out, nil
}

// rememberRecent moves a path to the front of the recent list.
func (a *App) rememberRecent(path string) {
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}

	a.recentMu.Lock()
	defer a.recentMu.Unlock()

	paths, err := a.readRecent()
	if err != nil {
		paths = nil
	}

	next := make([]string, 0, len(paths)+1)
	next = append(next, abs)
	for _, p := range paths {
		if p == abs {
			continue
		}
		next = append(next, p)
		if len(next) == maxRecentFiles {
			break
		}
	}

	// The recent list is a convenience, so a write failure is swallowed
	// rather than surfaced in the middle of opening or saving a file.
	_ = a.writeRecent(next)
}

func (a *App) readRecent() ([]string, error) {
	path, err := recentPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var paths []string
	if err := json.Unmarshal(data, &paths); err != nil {
		// A corrupt list is not worth refusing to start over.
		return nil, nil
	}
	return paths, nil
}

func (a *App) writeRecent(paths []string) error {
	path, err := recentPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.Marshal(paths)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func recentPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, configDirName, recentFileName), nil
}
