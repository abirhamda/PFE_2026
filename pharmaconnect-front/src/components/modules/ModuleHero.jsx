import React from "react";

export default function ModuleHero({ eyebrow, title, description, actions }) {
  return (
    <div className="bg-primary rounded-card border border-primary/20 shadow-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-white/65">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
