import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { editorExtensions } from "./setup";

type EditorProps = {
  /** Only read when the view is created; later edits live in the view. */
  initialText?: string;
};

export function Editor({ initialText = "" }: EditorProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialText,
        extensions: editorExtensions(),
      }),
      parent,
    });
    view.focus();

    return () => view.destroy();
    // The document is owned by the view once mounted, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="editor-host" ref={host} />;
}
