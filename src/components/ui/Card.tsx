import type { HTMLAttributes } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-card-border bg-surface p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-sm font-medium text-muted-text uppercase tracking-wide ${className}`}>{children}</h3>;
}

export function CardValue({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <p className={`mt-2 text-2xl font-semibold text-foreground ${className}`}>{children}</p>;
}
