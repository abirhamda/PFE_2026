import React from "react";
import { X } from "lucide-react";

export default function ModalPanel({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-card border border-border bg-card shadow-card-hover">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-gray-50/60 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-border bg-gray-50/60 px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
