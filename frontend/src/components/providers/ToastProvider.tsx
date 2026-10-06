"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  image?: string;
}

const ToastContext = createContext<(message: string, opts?: { kind?: ToastKind; image?: string }) => void>(
  () => {},
);

export const useToast = () => useContext(ToastContext);

const DURATION_MS = 3500;

/** Airbnb-style toasts: small cards stacked in the bottom-left corner. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message: string, opts: { kind?: ToastKind; image?: string } = {}) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, kind: opts.kind ?? "success", image: opts.image }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-3 md:bottom-6 md:left-6 md:right-auto"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex w-full items-center gap-3 rounded-xl bg-surface p-3 pr-2 text-sm font-medium text-ink shadow-card ring-1 ring-line-soft md:w-[360px]"
          >
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : t.kind === "error" ? (
              <XCircle className="h-6 w-6 shrink-0 text-brand" />
            ) : (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="rounded-full p-1.5 text-muted hover:bg-surface-soft"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
