package main

import "context"

// App holds the application context and exposes the methods bound to the
// frontend. Every filesystem operation lives here; the frontend never touches
// disk directly.
type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}
