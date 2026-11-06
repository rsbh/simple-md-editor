package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/cucumber/godog"
)

func TestFeatures(t *testing.T) {
	suite := godog.TestSuite{
		ScenarioInitializer: initializeScenario,
		Options: &godog.Options{
			Format:   "pretty",
			Paths:    []string{"features"},
			TestingT: t,
			Strict:   true,
		},
	}
	if suite.Run() != 0 {
		t.Fatal("feature tests failed")
	}
}

// world is the state one scenario builds up. Every scenario gets a fresh
// directory for its documents and a fresh config directory for the recent
// list, so nothing leaks between scenarios or onto the developer's machine.
type world struct {
	dir string
	app *App

	doc     *Document
	readErr error

	save    *SaveResult
	saveErr error

	// original is the file's content before an unedited round trip.
	original []byte
}

func (w *world) reset() {
	w.dir = mustTempDir()
	w.app = newTestApp(filepath.Join(w.dir, "config"))
	w.doc = nil
	w.readErr = nil
	w.save = nil
	w.saveErr = nil
	w.original = nil
}

func mustTempDir() string {
	dir, err := os.MkdirTemp("", "smde-")
	if err != nil {
		panic(err)
	}
	return dir
}

// path resolves a name from a feature file against the scenario's directory.
// An empty name stays empty, so the "no path" case reaches the code under test.
func (w *world) path(name string) string {
	if name == "" {
		return ""
	}
	return filepath.Join(w.dir, name)
}

func (w *world) writeFileOnDisk(name, content string) error {
	return os.WriteFile(w.path(name), []byte(content), 0o644)
}

// touchLater pushes a file's modification stamp forward so a change made
// within the filesystem's timestamp resolution is still visible as a change.
func (w *world) touchLater(name string) error {
	later := time.Now().Add(2 * time.Second)
	return os.Chtimes(w.path(name), later, later)
}

func initializeScenario(sc *godog.ScenarioContext) {
	w := &world{}

	sc.Before(func(ctx context.Context, _ *godog.Scenario) (context.Context, error) {
		w.reset()
		return ctx, nil
	})
	sc.After(func(ctx context.Context, _ *godog.Scenario, _ error) (context.Context, error) {
		return ctx, os.RemoveAll(w.dir)
	})

	sc.Step(`^a file "([^"]*)" containing:$`, w.aFileContaining)
	sc.Step(`^a file "([^"]*)" shaped like (.+)$`, w.aFileShapedLike)
	sc.Step(`^I have read "([^"]*)"$`, w.iRead)
	sc.Step(`^"([^"]*)" was changed elsewhere to:$`, w.wasChangedElsewhere)
	sc.Step(`^"([^"]*)" was deleted elsewhere$`, w.wasDeletedElsewhere)

	sc.Step(`^I read "([^"]*)"$`, w.iRead)
	sc.Step(`^I read (\d+) separate files$`, w.iReadSeparateFiles)
	sc.Step(`^I save "([^"]*)" with:$`, w.iSave)
	sc.Step(`^I save "([^"]*)" forcing the write with:$`, w.iSaveForcing)
	sc.Step(`^I save it back unchanged$`, w.iSaveBackUnchanged)

	sc.Step(`^the read succeeds$`, w.theReadSucceeds)
	sc.Step(`^the read fails$`, w.theReadFails)
	sc.Step(`^the document text is:$`, w.theDocumentTextIs)
	sc.Step(`^the document path is "([^"]*)"$`, w.theDocumentPathIs)
	sc.Step(`^the document carries a modification stamp$`, w.theDocumentCarriesAStamp)
	sc.Step(`^the save succeeds$`, w.theSaveSucceeds)
	sc.Step(`^the save fails$`, w.theSaveFails)
	sc.Step(`^the save reports a conflict$`, w.theSaveReportsAConflict)
	sc.Step(`^"([^"]*)" contains:$`, w.fileContains)
	sc.Step(`^"([^"]*)" is byte for byte what it was$`, w.fileIsUnchanged)
	sc.Step(`^the recent list is:$`, w.theRecentListIs)
	sc.Step(`^the recent list holds (\d+) entries$`, w.theRecentListHolds)
}

func (w *world) aFileContaining(name string, body *godog.DocString) error {
	return w.writeFileOnDisk(name, body.Content)
}

// fileShapes keeps the byte-level detail in Go rather than in the feature
// file, where Gherkin's own escaping would get in the way of expressing
// carriage returns and tabs exactly.
var fileShapes = map[string]string{
	"plain lines":           "first line\nsecond line\n",
	"no trailing newline":   "this one just ends",
	"carriage returns":      "windows\r\nline\r\nendings\r\n",
	"mixed line endings":    "unix\nwindows\r\nunix again\n",
	"trailing whitespace":   "spaces at the end   \nand a tab\t\n",
	"tabs between words":    "tabs\tbetween\twords\n",
	"multi-byte characters": "em \u2014 dash, caf\u00e9, \U0001f331\n",
	"an empty file":         "",
}

func (w *world) aFileShapedLike(name, shape string) error {
	content, ok := fileShapes[strings.TrimSpace(shape)]
	if !ok {
		return fmt.Errorf("no file shape named %q", shape)
	}
	return w.writeFileOnDisk(name, content)
}

func (w *world) iRead(name string) error {
	w.doc, w.readErr = w.app.ReadFile(w.path(name))
	if w.doc != nil {
		w.original = []byte(w.doc.Text)
	}
	return nil
}

func (w *world) iReadSeparateFiles(count int) error {
	for i := range count {
		name := fmt.Sprintf("file-%02d.md", i)
		if err := w.writeFileOnDisk(name, name); err != nil {
			return err
		}
		if _, err := w.app.ReadFile(w.path(name)); err != nil {
			return err
		}
	}
	return nil
}

func (w *world) wasChangedElsewhere(name string, body *godog.DocString) error {
	if err := w.writeFileOnDisk(name, body.Content); err != nil {
		return err
	}
	return w.touchLater(name)
}

func (w *world) wasDeletedElsewhere(name string) error {
	return os.Remove(w.path(name))
}

func (w *world) iSave(name string, body *godog.DocString) error {
	stamp := int64(0)
	if w.doc != nil {
		stamp = w.doc.ModTime
	}
	w.save, w.saveErr = w.app.SaveFile(w.path(name), body.Content, stamp)
	return nil
}

func (w *world) iSaveForcing(name string, body *godog.DocString) error {
	w.save, w.saveErr = w.app.SaveFile(w.path(name), body.Content, 0)
	return nil
}

func (w *world) iSaveBackUnchanged() error {
	if w.doc == nil {
		return fmt.Errorf("no document has been read")
	}
	w.save, w.saveErr = w.app.SaveFile(w.doc.Path, w.doc.Text, w.doc.ModTime)
	return nil
}

func (w *world) theReadSucceeds() error {
	if w.readErr != nil {
		return fmt.Errorf("read failed: %w", w.readErr)
	}
	if w.doc == nil {
		return fmt.Errorf("no document was returned")
	}
	return nil
}

func (w *world) theReadFails() error {
	if w.readErr == nil {
		return fmt.Errorf("expected the read to fail, but it succeeded")
	}
	return nil
}

func (w *world) theDocumentTextIs(body *godog.DocString) error {
	if err := w.theReadSucceeds(); err != nil {
		return err
	}
	if w.doc.Text != body.Content {
		return fmt.Errorf("document text is %q, want %q", w.doc.Text, body.Content)
	}
	return nil
}

func (w *world) theDocumentPathIs(name string) error {
	if err := w.theReadSucceeds(); err != nil {
		return err
	}
	if w.doc.Path != w.path(name) {
		return fmt.Errorf("document path is %q, want %q", w.doc.Path, w.path(name))
	}
	return nil
}

func (w *world) theDocumentCarriesAStamp() error {
	if err := w.theReadSucceeds(); err != nil {
		return err
	}
	if w.doc.ModTime == 0 {
		return fmt.Errorf("document has no modification stamp")
	}
	return nil
}

func (w *world) theSaveSucceeds() error {
	if w.saveErr != nil {
		return fmt.Errorf("save failed: %w", w.saveErr)
	}
	if w.save == nil {
		return fmt.Errorf("no save result was returned")
	}
	if w.save.Conflict {
		return fmt.Errorf("save reported a conflict")
	}
	if w.save.Document == nil {
		return fmt.Errorf("save returned no document")
	}
	return nil
}

func (w *world) theSaveFails() error {
	if w.saveErr == nil {
		return fmt.Errorf("expected the save to fail, but it did not")
	}
	return nil
}

func (w *world) theSaveReportsAConflict() error {
	if w.saveErr != nil {
		return fmt.Errorf("save failed outright: %w", w.saveErr)
	}
	if w.save == nil || !w.save.Conflict {
		return fmt.Errorf("expected a conflict, got %+v", w.save)
	}
	return nil
}

func (w *world) fileContains(name string, body *godog.DocString) error {
	data, err := os.ReadFile(w.path(name))
	if err != nil {
		return err
	}
	if string(data) != body.Content {
		return fmt.Errorf("%s contains %q, want %q", name, string(data), body.Content)
	}
	return nil
}

func (w *world) fileIsUnchanged(name string) error {
	data, err := os.ReadFile(w.path(name))
	if err != nil {
		return err
	}
	if string(data) != string(w.original) {
		return fmt.Errorf("%s is now %q, was %q", name, string(data), string(w.original))
	}
	return nil
}

func (w *world) theRecentListIs(table *godog.Table) error {
	recent, err := w.app.RecentFiles()
	if err != nil {
		return err
	}

	want := make([]string, 0, len(table.Rows))
	for _, row := range table.Rows {
		want = append(want, strings.TrimSpace(row.Cells[0].Value))
	}

	got := make([]string, 0, len(recent))
	for _, file := range recent {
		got = append(got, file.Name)
	}

	if strings.Join(got, ", ") != strings.Join(want, ", ") {
		return fmt.Errorf("recent list is [%s], want [%s]",
			strings.Join(got, ", "), strings.Join(want, ", "))
	}
	return nil
}

func (w *world) theRecentListHolds(count int) error {
	recent, err := w.app.RecentFiles()
	if err != nil {
		return err
	}
	if len(recent) != count {
		return fmt.Errorf("recent list holds %d entries, want %d", len(recent), count)
	}
	return nil
}

// newTestApp builds an App whose recent list lives somewhere disposable.
func newTestApp(configDir string) *App {
	return &App{configDir: configDir}
}
