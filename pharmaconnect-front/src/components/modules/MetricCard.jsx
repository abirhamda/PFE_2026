import React from "react";
import { Card, CardContent } from "../ui/Card";

const tones = {
  cyan: "bg-cyan-100 text-cyan-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function MetricCard({ icon: Icon, label, value, helper, tone = "cyan" }) {
  return (
    <Card className="border-slate-200/90 bg-white/95 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
            {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
          </div>
          {Icon ? (
            <div className={`rounded-2xl p-3 ${tones[tone] || tones.cyan}`}>
              <Icon size={20} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
