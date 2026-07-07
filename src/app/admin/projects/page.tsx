"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface ProjectRow {
  id: string;
  prefix: string;
  name: string;
  status: string;
  totalShares: number;
  installmentMonths: number;
  _count: { shares: number; customers: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          {!loading && projects.length === 0 && (
            <p className="mt-1 text-sm text-muted-text">Set up your first land project to get started.</p>
          )}
        </div>
        <Link href="/admin/projects/new">
          <Button>{projects.length === 0 ? "Create first project" : "Add project"}</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-card-border bg-surface p-5">
              <div className="h-3 w-12 animate-pulse rounded-md bg-surface-alt" />
              <div className="mt-3 h-7 w-40 animate-pulse rounded-md bg-surface-alt" />
              <div className="mt-3 h-3 w-32 animate-pulse rounded-md bg-surface-alt" />
              <div className="mt-2 h-3 w-48 animate-pulse rounded-md bg-surface-alt" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={32} strokeWidth={1.5} />}
          title="No projects yet"
          description="Your ERP is ready. Create a project for each plot or development — with its own prefix, share count, and installment plan."
          steps={[
            "Add project details (e.g. GVR — Green Valley)",
            "Configure shares and pricing phases",
            "Enroll customers and track payments",
          ]}
          action={{ label: "Create first project", href: "/admin/projects/new" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/admin/projects/${p.id}`}>
              <Card className="transition-colors hover:border-emerald/40">
                <CardTitle>{p.prefix}</CardTitle>
                <CardValue>{p.name}</CardValue>
                <p className="mt-2 text-sm text-muted-text">Status: {p.status}</p>
                <p className="text-sm text-muted-text">
                  {p._count.shares} shares · {p._count.customers} customers
                </p>
                <p className="text-sm text-muted-text">{p.installmentMonths}-month plan</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
