import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
      {Icon ? (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
          <Icon size={24} />
        </div>
      ) : null}
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
