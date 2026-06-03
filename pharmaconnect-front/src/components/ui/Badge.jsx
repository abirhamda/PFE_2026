import React from "react";
import { cn } from "../../utils/cn";

const variants = {
  success: "bg-medical-success-bg text-medical-success",
  danger:  "bg-medical-danger-bg  text-medical-danger",
  warning: "bg-medical-warning-bg text-medical-warning",
  info:    "bg-accent-light        text-accent",
  neutral: "bg-gray-100            text-gray-600",
};

const Badge = ({ variant = "neutral", children, className, ...props }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
      variants[variant] || variants.neutral,
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
