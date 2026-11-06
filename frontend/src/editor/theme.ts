import { EditorView } from "@codemirror/view";

/**
 * The writing surface: a single measured column, centred, with no gutters,
 * no active-line highlight and no visible frame. The trailing padding leaves
 * room for the caret to sit mid-window once typewriter scrolling lands.
 */
export const zenTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "17px",
    color: "var(--fg)",
    backgroundColor: "transparent",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-prose)",
    lineHeight: "1.7",
    overflowX: "hidden",
    overflowY: "auto",
  },
  ".cm-content": {
    maxWidth: "68ch",
    margin: "0 auto",
    padding: "6vh 24px 50vh",
    caretColor: "var(--caret)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftWidth: "2px",
    borderLeftColor: "var(--caret)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "var(--selection)",
    },
});
