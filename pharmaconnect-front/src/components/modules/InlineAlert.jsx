import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const toneMap = {
  success: {
    wrapper: "border-l-4 border-medical-success bg-medical-success-bg text-medical-success",
    Icon: CheckCircle2,
  },
  error: {
    wrapper: "border-l-4 border-medical-danger bg-medical-danger-bg text-medical-danger",
    Icon: AlertCircle,
  },
  info: {
    wrapper: "border-l-4 border-accent bg-accent-light text-accent",
    Icon: Info,
  },
};

export default function InlineAlert({ message, type = "info" }) {
  if (!message) return null;

  const tone = toneMap[type] || toneMap.info;
  const Icon = tone.Icon;

  return (
    <div className={`rounded-card px-4 py-3 text-sm ${tone.wrapper}`}>
      <div className="flex items-start gap-3">
        <Icon size={17} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
