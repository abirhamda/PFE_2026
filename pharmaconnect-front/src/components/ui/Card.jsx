import React from "react";
import { cn } from "../../utils/cn";

export function Card({ className, children, title, subtitle, action, ...props }) {
  if (title !== undefined || subtitle !== undefined || action !== undefined) {
    return (
      <div
        className={cn("bg-card rounded-card border border-border shadow-card p-5", className)}
        {...props}
      >
        {(title || action) && (
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-text-primary tracking-wide">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("bg-card rounded-card border border-border shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("border-b border-border px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-sm font-semibold text-text-primary tracking-wide", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-xs text-text-secondary mt-0.5", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn("border-t border-border px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
