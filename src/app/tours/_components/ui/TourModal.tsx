"use client";

import { useEffect } from "react";
import { X, Volume2 } from "lucide-react";

type TourModalProps = {
  open: boolean;
  onClose: () => void;
  tourUrl: string | null;
  title: string;
};

export function TourModal({ open, onClose, tourUrl, title }: TourModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !tourUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-card border border-hairline-2 bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <div>
            <p className="font-tours-sans text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-tours">
              <Volume2 className="h-3.5 w-3.5" />
              El audio arranca sólo si lo activás dentro del tour
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline-2 text-body transition hover:border-gold hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe
          key={tourUrl}
          src={tourUrl}
          title={title}
          loading="eager"
          allow="xr-spatial-tracking; gyroscope; accelerometer"
          allowFullScreen
          className="h-full w-full flex-1 border-0 bg-ink"
        />
      </div>
    </div>
  );
}
