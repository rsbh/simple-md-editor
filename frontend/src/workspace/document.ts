/** The document currently open in the editor. */
export type DocState = {
  /** null until the document has been saved somewhere. */
  path: string | null;
  /** The text as it exists on disk, used to decide whether there are edits. */
  savedText: string;
  /** Stamp of the file when last read or written; 0 for an unsaved document. */
  modTime: number;
};

export const emptyDoc: DocState = { path: null, savedText: "", modTime: 0 };

export function baseName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export function displayName(doc: DocState): string {
  return doc.path ? baseName(doc.path) : "Untitled";
}

/** A reasonable filename to offer when saving an untitled document. */
export function suggestedFileName(text: string): string {
  const firstLine = text.split("\n", 1)[0] ?? "";
  const heading = firstLine.replace(/^#+\s*/, "").trim();
  if (!heading) return "Untitled.md";
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug ? `${slug}.md` : "Untitled.md";
}
