export type Command = {
  id: string;
  title: string;
  /** Shown dimmed beside the title, e.g. the path of a recent file. */
  detail?: string;
  /** Extra text to match against that is not shown. */
  keywords?: string;
  run: () => void | Promise<void>;
};

/**
 * What the palette is currently showing. Confirmations reuse the palette
 * rather than opening a dialog, so the window keeps its single surface.
 */
export type PaletteMode =
  | { kind: "closed" }
  | { kind: "commands" }
  | { kind: "confirm"; message: string; confirmLabel: string; onConfirm: () => void };
