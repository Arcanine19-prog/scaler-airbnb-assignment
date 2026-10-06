"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class for the dialog on desktop. */
  size?: string;
  /** Full-screen on phones (Airbnb's mobile modals slide up full height). */
  fullScreenMobile?: boolean;
}

export function Modal({ open, onClose, title, footer, children, size = "max-w-xl", fullScreenMobile = true }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 md:items-center md:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={`animate-modal-in flex w-full flex-col overflow-hidden bg-surface text-ink shadow-card ${size} ${
          fullScreenMobile ? "h-[100dvh] md:h-auto md:max-h-[90vh] md:rounded-2xl" : "max-h-[90vh] rounded-t-2xl md:rounded-2xl"
        }`}
      >
        <div className="relative flex min-h-16 shrink-0 items-center justify-center border-b border-line-soft px-6">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute left-4 rounded-full p-2 hover:bg-surface-soft"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
          {title && <h2 className="text-base font-bold">{title}</h2>}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-line-soft px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
