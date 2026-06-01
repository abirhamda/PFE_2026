import React from "react";
import { Card, CardContent } from "../ui/Card";

export default function ModuleHero({ eyebrow, title, description, actions }) {
  return (
    <Card className="overflow-hidden rounded-3xl border-cyan-200/60 bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 text-white shadow-xl">
      <CardContent className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {eyebrow ? <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">{eyebrow}</p> : null}
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm text-cyan-100">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
