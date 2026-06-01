import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const toneMap = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-700",
    Icon: AlertCircle,
  },
  info: {
    wrapper: "border-cyan-200 bg-cyan-50 text-cyan-700",
    Icon: Info,
  },
};

export default function InlineAlert({ message, type = "info" }) {
  if (!message) return null;

  const tone = toneMap[type] || toneMap.info;
  const Icon = tone.Icon;

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${tone.wrapper}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
