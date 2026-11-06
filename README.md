# simple-md-editor

A minimal, distraction-free markdown editor for macOS. Wails (Go) + React, with
CodeMirror 6 as the writing surface.

The window has no chrome beyond a thin strip at the top, and the text sits in a
single measured column. Markdown is formatted live as you type rather than shown
in a separate preview.

## Prerequisites

- Go 1.27 or newer
- Node 26 (see `frontend/.nvmrc`)
- The Wails v2 CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Then confirm your machine has what Wails needs:

```bash
wails doctor
```

## Running

```bash
wails dev
```

This installs frontend dependencies, regenerates the Go bindings in
`frontend/wailsjs`, and opens the app with hot reload.

Those bindings are committed so the frontend type-checks on a fresh clone. They
are generated from the methods on `App`, so after changing one of those, run:

```bash
wails generate module
```

## Building

```bash
wails build
```

The bundle is written to `build/bin`.

## Working on the frontend alone

The editor can be driven in a browser without the desktop shell, which is useful
for quick iteration on the writing surface:

```bash
cd frontend && npm install && npm run dev
```

Anything that touches the filesystem is unavailable there, since that lives on
the Go side; those commands report as much instead of failing silently.

## Layout

| Path                 | Contents                                           |
| -------------------- | -------------------------------------------------- |
| `main.go`            | Window options and app wiring                       |
| `app.go`             | Methods bound to the frontend; all filesystem access |
| `frontend/src/editor`| CodeMirror configuration, theme, decorations        |

See `CLAUDE.md` for the product shape and the conventions this repo follows.
