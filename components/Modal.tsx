"use client";

import { useEffect } from "react";

// A simple pop-up. Closes with the button, the Escape key, or a tap outside.
export function Modal({ title, onClose, children, closeLabel = "Close" }: { title: string; onClose: () => void; children: React.ReactNode; closeLabel?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="grow">{title}</h2>
          <button type="button" className="link" onClick={onClose}>{closeLabel}</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// One-line alert pop-up with an OK button.
export function Alert({ text, ok, onClose }: { text: string; ok: string; onClose: () => void }) {
  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <div className="modal card" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <p dir="auto">{text}</p>
        <div><button type="button" className="btn" onClick={onClose} autoFocus>{ok}</button></div>
      </div>
    </div>
  );
}
