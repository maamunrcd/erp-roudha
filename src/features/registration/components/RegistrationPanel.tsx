"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import {
  REGISTRATION_STAGE_OPTIONS,
  registrationStageClass,
  registrationStageLabel,
} from "@/lib/constants/registration-stage";

interface RegistrationRow {
  id: string;
  trackingId: string;
  fullName: string;
  phone: string;
  status: string;
  shareCount: number;
  registrationStage: string;
  registrationNotes: string | null;
  registrationUpdatedAt: string | null;
  project: { prefix: string; name: string };
}

export function RegistrationPanel() {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (stageFilter) params.set("stage", stageFilter);
    const res = await fetch(`/api/registration?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [stageFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStage(id: string, registrationStage: string) {
    setSavingId(id);
    setError("");
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationStage }),
    });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="reg-stage">Stage filter</Label>
          <select
            id="reg-stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
          >
            <option value="">All stages</option>
            {REGISTRATION_STAGE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Shares</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-text">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-text">
                  No enrollments found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${row.id}/edit`}
                      className="font-mono text-emerald-light hover:underline"
                    >
                      {row.trackingId}
                    </Link>
                    <p className="text-xs text-muted-text">
                      {row.fullName} · {row.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-text">{row.project.prefix}</td>
                  <td className="px-4 py-3">{row.shareCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${registrationStageClass(row.registrationStage)}`}
                    >
                      {registrationStageLabel(row.registrationStage)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.registrationStage}
                      disabled={savingId === row.id}
                      onChange={(e) => updateStage(row.id, e.target.value)}
                      className="rounded-lg border border-card-border bg-input-bg px-2 py-1.5 text-xs"
                    >
                      {REGISTRATION_STAGE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
