import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  steps?: string[];
  action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, steps, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-card-border bg-surface-alt/20 px-6 py-16 text-center">
      {icon && <div className="mb-4 rounded-full bg-emerald/10 p-4 text-emerald">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-text">{description}</p>
      {steps && steps.length > 0 && (
        <ol className="mt-6 max-w-sm space-y-2 text-left text-sm text-muted-text">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="font-medium text-emerald">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
      {action && (
        <Link href={action.href} className="mt-8">
          <Button>{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
