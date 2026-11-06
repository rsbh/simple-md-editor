import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { editorExtensions } from "./setup";

type EditorProps = {
  /**
   * Read once, when the view is created. Loading another document remounts
   * this component so the new file starts with an empty undo history.
   */
  initialText?: string;
  onReady?: (view: EditorView) => void;
  onChange?: (text: string) => void;
};

export function Editor({ initialText = "", onReady, onChange }: EditorProps) {
  const host = useRef<HTMLDivElement>(null);

  // Held in refs so a changed callback never tears down the view.
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  onReadyRef.current = onReady;
  onChangeRef.current = onChange;

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialText,
        extensions: [
          ...editorExtensions(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent,
    });
    view.focus();
    onReadyRef.current?.(view);

    return () => view.destroy();
    // The document is owned by the view once mounted, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="editor-host" ref={host} />;
}
