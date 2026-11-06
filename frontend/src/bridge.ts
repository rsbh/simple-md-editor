/**
 * Typed access to the Go side. Everything that touches the filesystem goes
 * through here, and nothing else in the frontend imports the generated
 * bindings directly.
 */
import {
  OpenFile,
  Quit,
  ReadFile,
  RecentFiles,
  SaveFile,
  SaveFileAs,
  SetWindowTitle,
} from "../wailsjs/go/main/App";
import type { main } from "../wailsjs/go/models";

export type Document = main.Document;
export type RecentFile = main.RecentFile;
export type SaveResult = main.SaveResult;

/**
 * The frontend also runs in a plain browser for quick iteration on the
 * writing surface, where no Go side exists.
 */
export function hasBackend(): boolean {
  return typeof window !== "undefined" && "go" in window;
}

export class NoBackendError extends Error {
  constructor() {
    super("Files are only available in the desktop app.");
    this.name = "NoBackendError";
  }
}

function requireBackend(): void {
  if (!hasBackend()) throw new NoBackendError();
}

/** Resolves to null when the user dismisses the dialog. */
export async function openFile(): Promise<Document | null> {
  requireBackend();
  return (await OpenFile()) ?? null;
}

export async function readFile(path: string): Promise<Document> {
  requireBackend();
  return await ReadFile(path);
}

/**
 * Pass the modTime the frontend is holding to be told about a file that
 * changed underneath it, or 0 to write regardless.
 */
export async function saveFile(
  path: string,
  text: string,
  expectedModTime: number,
): Promise<SaveResult> {
  requireBackend();
  return await SaveFile(path, text, expectedModTime);
}

/** Resolves to null when the user dismisses the dialog. */
export async function saveFileAs(
  suggestedName: string,
  text: string,
): Promise<Document | null> {
  requireBackend();
  return (await SaveFileAs(suggestedName, text)) ?? null;
}

export async function recentFiles(): Promise<RecentFile[]> {
  if (!hasBackend()) return [];
  return (await RecentFiles()) ?? [];
}

export function setWindowTitle(title: string): void {
  if (!hasBackend()) return;
  void SetWindowTitle(title);
}

export function quit(): void {
  if (!hasBackend()) return;
  void Quit();
}
