package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "simple-md-editor",
		Width:     1100,
		Height:    760,
		MinWidth:  480,
		MinHeight: 320,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// No native chrome: the strip along the top of the window is the only
		// drag region, so the writing surface fills everything below it.
		Frameless: true,
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  false,
		},
	})
	if err != nil {
		println("error:", err.Error())
	}
}
