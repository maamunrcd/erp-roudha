import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-emerald text-white hover:bg-emerald-dark border border-emerald",
  gold: "bg-gold/20 text-gold border border-gold-border hover:bg-gold/30",
  ghost: "bg-transparent text-foreground hover:bg-surface-alt border border-card-border",
  danger: "bg-red-900/30 text-red-400 border border-red-800",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
