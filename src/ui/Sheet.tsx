import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet over the current view; closes with ✕, backdrop tap or Escape. */
export function Sheet({ title, onClose, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // runs once on open: focus, Escape key, no background scrolling
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Portal: rendered at <body> level so no ancestor can put it below other layers.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="btn-back"
            onClick={onClose}
            aria-label="Schliessen"
          >
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface InfoButtonProps {
  label: string;
  onClick: () => void;
}

/** Round ⓘ button with a 44 px touch target. */
export function InfoButton({ label, onClick }: InfoButtonProps) {
  return (
    <button
      type="button"
      className="info-button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span aria-hidden="true">i</span>
    </button>
  );
}
