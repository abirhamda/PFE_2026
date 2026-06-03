import React from "react";

const tones = {
  cyan:    "bg-accent-light text-accent",
  emerald: "bg-medical-success-bg text-medical-success",
  amber:   "bg-medical-warning-bg text-medical-warning",
  rose:    "bg-medical-danger-bg text-medical-danger",
  slate:   "bg-gray-100 text-gray-600",
};

export default function MetricCard({ icon: Icon, label, value, helper, tone = "cyan" }) {
  return (
    <div className="bg-card rounded-card border border-border shadow-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
          <p className="mt-2.5 text-3xl font-semibold text-text-primary">{value}</p>
          {helper ? <p className="mt-1.5 text-xs text-text-secondary leading-snug">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className={`rounded-lg p-2.5 flex-shrink-0 ${tones[tone] || tones.cyan}`}>
            <Icon size={19} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
