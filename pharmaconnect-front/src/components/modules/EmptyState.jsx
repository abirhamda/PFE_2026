import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-gray-50 px-4 py-12 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-light text-accent">
          <Icon size={22} />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
