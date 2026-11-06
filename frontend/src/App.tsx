import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";

import * as files from "./bridge";
import { Editor } from "./editor/Editor";
import { Palette } from "./palette/Palette";
import type { Command, PaletteMode } from "./palette/types";
import {
  displayName,
  emptyDoc,
  suggestedFileName,
  type DocState,
} from "./workspace/document";

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function App() {
  const viewRef = useRef<EditorView | null>(null);
  const docRef = useRef<DocState>(emptyDoc);
  const initialTextRef = useRef("");
  const statusTimer = useRef<number | undefined>(undefined);

  const [docKey, setDocKey] = useState(0);
  const [name, setName] = useState(displayName(emptyDoc));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [recent, setRecent] = useState<files.RecentFile[]>([]);
  const [mode, setMode] = useState<PaletteMode>({ kind: "closed" });

  const currentText = () => viewRef.current?.state.doc.toString() ?? "";

  const flash = useCallback((text: string) => {
    setStatus(text);
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), 3000);
  }, []);

  const refreshRecent = useCallback(() => {
    files.recentFiles().then(setRecent, () => undefined);
  }, []);

  useEffect(refreshRecent, [refreshRecent]);
  useEffect(() => () => window.clearTimeout(statusTimer.current), []);

  // There is no title bar, but the window name still shows up elsewhere in
  // the system, so keep it in step with the document.
  useEffect(() => {
    files.setWindowTitle(dirty ? `${name} — edited` : name);
  }, [name, dirty]);

  /** Swap in another document, remounting the editor to reset undo history. */
  const loadDocument = useCallback((doc: DocState, text: string) => {
    docRef.current = doc;
    initialTextRef.current = text;
    setDocKey((key) => key + 1);
    setName(displayName(doc));
    setDirty(false);
  }, []);

  const adoptSaved = useCallback((saved: files.Document) => {
    docRef.current = {
      path: saved.path,
      savedText: saved.text,
      modTime: saved.modTime,
    };
    setName(displayName(docRef.current));
    setDirty(false);
  }, []);

  const newDocument = useCallback(() => {
    loadDocument(emptyDoc, "");
  }, [loadDocument]);

  const openPath = useCallback(
    async (path: string) => {
      try {
        const doc = await files.readFile(path);
        loadDocument(
          { path: doc.path, savedText: doc.text, modTime: doc.modTime },
          doc.text,
        );
        refreshRecent();
      } catch (error) {
        flash(errorText(error));
      }
    },
    [flash, loadDocument, refreshRecent],
  );

  const openDialog = useCallback(async () => {
    try {
      const doc = await files.openFile();
      if (!doc) return;
      loadDocument(
        { path: doc.path, savedText: doc.text, modTime: doc.modTime },
        doc.text,
      );
      refreshRecent();
    } catch (error) {
      flash(errorText(error));
    }
  }, [flash, loadDocument, refreshRecent]);

  const saveAs = useCallback(async () => {
    const text = currentText();
    try {
      const saved = await files.saveFileAs(suggestedFileName(text), text);
      if (!saved) return;
      adoptSaved(saved);
      refreshRecent();
      flash("Saved");
    } catch (error) {
      flash(errorText(error));
    }
  }, [adoptSaved, flash, refreshRecent]);

  const save = useCallback(
    async (force = false) => {
      const doc = docRef.current;
      if (!doc.path) {
        await saveAs();
        return;
      }

      const text = currentText();
      try {
        const result = await files.saveFile(
          doc.path,
          text,
          force ? 0 : doc.modTime,
        );

        if (result.conflict) {
          setMode({
            kind: "confirm",
            message: `${displayName(doc)} has changed on disk since it was opened.`,
            confirmLabel: "Overwrite with this version",
            onConfirm: () => void save(true),
          });
          return;
        }

        if (result.document) {
          adoptSaved(result.document);
          refreshRecent();
          flash("Saved");
        }
      } catch (error) {
        flash(errorText(error));
      }
    },
    [adoptSaved, flash, refreshRecent, saveAs],
  );

  /** Run an action, asking first when it would throw away unsaved edits. */
  const guard = useCallback(
    (action: () => void, description: string) => {
      if (!dirty) {
        action();
        return;
      }
      setMode({
        kind: "confirm",
        message: `${name} has unsaved changes.`,
        confirmLabel: `Discard changes and ${description}`,
        onConfirm: action,
      });
    },
    [dirty, name],
  );

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: "new",
        title: "New document",
        keywords: "create blank empty",
        run: () => guard(newDocument, "start a new document"),
      },
      {
        id: "open",
        title: "Open…",
        keywords: "file browse load",
        run: () => guard(() => void openDialog(), "open another file"),
      },
      {
        id: "save",
        title: "Save",
        keywords: "write disk store",
        run: () => void save(),
      },
      {
        id: "save-as",
        title: "Save As…",
        keywords: "write copy rename duplicate",
        run: () => void saveAs(),
      },
      {
        id: "quit",
        title: "Quit",
        keywords: "exit close window",
        run: () => guard(files.quit, "quit"),
      },
    ];

    recent.forEach((file) => {
      list.push({
        id: `recent:${file.path}`,
        title: `Open ${file.name}`,
        detail: file.path,
        keywords: "recent reopen history",
        run: () => guard(() => void openPath(file.path), "open that file"),
      });
    });

    return list;
  }, [guard, newDocument, openDialog, openPath, save, saveAs, recent]);

  const closePalette = useCallback(() => {
    setMode({ kind: "closed" });
  }, []);

  // Focus follows the mode rather than the close call: running a command can
  // immediately reopen the palette to ask something, and the editor must not
  // snatch the keyboard back while that question is on screen.
  useEffect(() => {
    if (mode.kind === "closed") viewRef.current?.focus();
  }, [mode.kind]);

  // The palette is the whole interface, so this is the one global binding.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setMode((current) =>
        current.kind === "closed" ? { kind: "commands" } : { kind: "closed" },
      );
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const confirmCommands = useMemo<Command[]>(() => {
    if (mode.kind !== "confirm") return [];
    return [
      { id: "confirm", title: mode.confirmLabel, run: mode.onConfirm },
      { id: "cancel", title: "Cancel", run: () => undefined },
    ];
  }, [mode]);

  return (
    <div className="app">
      {/* The window has no native chrome, so this strip is the only way to
          move it. It becomes the tab strip once tabs land. */}
      <div className="drag-strip">
        <span className="strip-label" data-status={status !== null}>
          {status ?? name}
          {status === null && dirty ? (
            <span className="dirty-dot" aria-label="unsaved changes" />
          ) : null}
        </span>
      </div>

      <Editor
        key={docKey}
        initialText={initialTextRef.current}
        onReady={(view) => {
          viewRef.current = view;
        }}
        onChange={(text) => setDirty(text !== docRef.current.savedText)}
      />

      {mode.kind !== "closed" ? (
        <Palette
          // Remount on every change of question so the input is refocused and
          // the previous query does not filter the new choices.
          key={mode.kind === "confirm" ? `confirm:${mode.message}` : "commands"}
          commands={mode.kind === "confirm" ? confirmCommands : commands}
          message={mode.kind === "confirm" ? mode.message : undefined}
          placeholder={
            mode.kind === "confirm" ? "Choose" : "Type a command"
          }
          onClose={closePalette}
        />
      ) : null}
    </div>
  );
}
