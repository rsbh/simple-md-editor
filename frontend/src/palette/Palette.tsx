import { useEffect, useMemo, useRef, useState } from "react";

import { rank } from "./filter";
import type { Command } from "./types";

type PaletteProps = {
  commands: Command[];
  /** Shown above the list, e.g. to ask for confirmation. */
  message?: string;
  placeholder?: string;
  onClose: () => void;
};

export function Palette({
  commands,
  message,
  placeholder = "Type a command",
  onClose,
}: PaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(
    () => rank(query, commands, (c) => `${c.title} ${c.keywords ?? ""}`),
    [query, commands],
  );

  // A new query can leave the previous selection out of range.
  const selected = Math.min(active, Math.max(matches.length - 1, 0));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, matches.length]);

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => (matches.length ? (i + 1) % matches.length : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) =>
          matches.length ? (i - 1 + matches.length) % matches.length : 0,
        );
        break;
      case "Enter": {
        event.preventDefault();
        const command = matches[selected];
        if (command) {
          onClose();
          void command.run();
        }
        break;
      }
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  }

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="Commands"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {message ? <p className="palette-message">{message}</p> : null}
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul className="palette-list" ref={listRef}>
          {matches.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                className="palette-item"
                data-active={index === selected}
                onMouseMove={() => setActive(index)}
                onClick={() => {
                  onClose();
                  void command.run();
                }}
              >
                <span className="palette-title">{command.title}</span>
                {command.detail ? (
                  <span className="palette-detail">{command.detail}</span>
                ) : null}
              </button>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="palette-empty">No matching command</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
