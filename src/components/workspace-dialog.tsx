"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const focusableSelector = [
  "input:not([type=hidden]):not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "button:not(:disabled)",
  "a[href]",
].join(",");

export function WorkspaceDialog({
  title,
  eyebrow = "WORKSPACE",
  className = "",
  onClose,
  children,
}: {
  title: string;
  eyebrow?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const initialFocus = dialog?.querySelector<HTMLElement>("[data-dialog-initial-focus]")
      ?? dialog?.querySelector<HTMLElement>("input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)")
      ?? dialog?.querySelector<HTMLElement>("button:not(:disabled), a[href]");
    (initialFocus ?? dialog)?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeRef.current();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <section ref={dialogRef} className={`form-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title" tabIndex={-1} onKeyDown={handleKeyDown}>
      <div className="modal-heading">
        <div><p className="eyebrow">{eyebrow}</p><h2 id="workspace-dialog-title">{title}</h2></div>
        <button type="button" className="modal-close" onClick={() => closeRef.current()} aria-label="Close dialog">×</button>
      </div>
      {children}
    </section>
  </div>;
}
