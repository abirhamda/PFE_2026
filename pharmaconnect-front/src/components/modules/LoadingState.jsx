import React from "react";

export default function LoadingState({ message = "Chargement..." }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-700 border-t-transparent" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
