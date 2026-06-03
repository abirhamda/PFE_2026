import React from "react";
import { cn } from "../../utils/cn";

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantStyles = {
    primary:
      "bg-primary hover:bg-primary-hover text-white focus-visible:ring-primary",
    secondary:
      "bg-primary/80 hover:bg-primary text-white focus-visible:ring-primary",
    accent:
      "bg-accent hover:bg-accent/90 text-white focus-visible:ring-accent",
    outline:
      "border border-border bg-card text-text-primary hover:bg-gray-50 focus-visible:ring-accent",
    ghost:
      "bg-transparent text-text-primary hover:bg-gray-100 focus-visible:ring-accent",
    link:
      "bg-transparent text-accent hover:underline focus-visible:ring-accent",
    danger:
      "bg-medical-danger-bg text-medical-danger hover:bg-red-100 focus-visible:ring-medical-danger",
    "danger-solid":
      "bg-medical-danger text-white hover:bg-red-700 focus-visible:ring-medical-danger",
    success:
      "bg-medical-success-bg text-medical-success hover:bg-green-100 focus-visible:ring-medical-success",
    "success-solid":
      "bg-medical-success text-white hover:bg-green-700 focus-visible:ring-medical-success",
  };

  const sizeStyles = {
    xs: "h-7 px-2 text-xs gap-1",
    sm: "h-8 px-3 text-sm gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-11 px-6 text-base gap-2",
    xl: "h-12 px-8 text-lg gap-2",
  };

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.14 5.82 3 7.94l3-2.65z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span>{rightIcon}</span>}
    </button>
  );
};

export default Button;
