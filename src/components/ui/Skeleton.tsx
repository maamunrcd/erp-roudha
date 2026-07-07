import type { HTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("animate-pulse rounded-md bg-surface-alt", className)}
      {...props}
    />
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-card-border bg-surface p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border">
      <div className="border-b border-card-border bg-surface-alt px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 border-t border-card-border px-4 py-4">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-card-border bg-surface p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

export function CustomerTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-20" />
      </div>
      <TableSkeleton rows={8} cols={9} />
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
      <CardGridSkeleton count={4} />
      <Skeleton className="h-6 w-40" />
      <TableSkeleton rows={5} cols={8} />
    </div>
  );
}

export function PortalDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-card-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <CardGridSkeleton count={4} />
        <Skeleton className="h-6 w-44" />
        <TableSkeleton rows={6} cols={5} />
        <Skeleton className="h-6 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-card-border bg-surface p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-card-border bg-surface p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
