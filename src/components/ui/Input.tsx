import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted-text focus:border-emerald focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-text">
      {children}
    </label>
  );
}
