import React from "react";

export default function LoadingState({ message = "Chargement..." }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-gray-50 px-4 py-12 text-center">
      <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
