import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  EditorView,
  drawSelection,
  dropCursor,
  keymap,
  placeholder,
} from "@codemirror/view";
import type { Extension } from "@codemirror/state";

import { zenTheme } from "./theme";

/**
 * Deliberately short. Line numbers, fold gutters, bracket matching and
 * active-line highlighting all belong to code editing, not to prose.
 */
export function editorExtensions(): Extension[] {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    EditorView.lineWrapping,
    markdown(),
    placeholder("Start writing. ⌘K for commands."),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    zenTheme,
  ];
}
