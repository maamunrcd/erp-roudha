"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

interface ProjectOpt {
  id: string;
  prefix: string;
  name: string;
}

interface AgreementRow {
  id: string;
  projectId: string;
  developerName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  signedAt: string | null;
  ourSharePercent: number | null;
  developerSharePercent: number | null;
  constructionStart: string | null;
  expectedCompletion: string | null;
  status: string;
  notes: string | null;
  project: ProjectOpt;
}

const STATUSES = ["DRAFT", "SIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const emptyForm = {
  projectId: "",
  developerName: "",
  contactPhone: "",
  contactEmail: "",
  signedAt: "",
  ourSharePercent: "",
  developerSharePercent: "",
  constructionStart: "",
  expectedCompletion: "",
  status: "DRAFT" as (typeof STATUSES)[number],
  notes: "",
};

export function DeveloperAgreementPanel() {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [pRes, aRes] = await Promise.all([fetch("/api/projects"), fetch(`/api/developers${qs}`)]);
    if (pRes.ok) {
      const data = await pRes.json();
      setProjects(
        (Array.isArray(data) ? data : []).map((p: ProjectOpt) => ({
          id: p.id,
          prefix: p.prefix,
          name: p.name,
        })),
      );
    }
    if (aRes.ok) {
      const data = await aRes.json();
      setRows(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [filterProject]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row: AgreementRow) {
    setEditingId(row.id);
    setForm({
      projectId: row.projectId,
      developerName: row.developerName,
      contactPhone: row.contactPhone ?? "",
      contactEmail: row.contactEmail ?? "",
      signedAt: row.signedAt ? row.signedAt.slice(0, 10) : "",
      ourSharePercent: row.ourSharePercent != null ? String(row.ourSharePercent) : "",
      developerSharePercent: row.developerSharePercent != null ? String(row.developerSharePercent) : "",
      constructionStart: row.constructionStart ? row.constructionStart.slice(0, 10) : "",
      expectedCompletion: row.expectedCompletion ? row.expectedCompletion.slice(0, 10) : "",
      status: row.status as (typeof STATUSES)[number],
      notes: row.notes ?? "",
    });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      ...(editingId ? {} : { projectId: form.projectId }),
      developerName: form.developerName,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      signedAt: form.signedAt || null,
      ourSharePercent: form.ourSharePercent === "" ? null : Number(form.ourSharePercent),
      developerSharePercent:
        form.developerSharePercent === "" ? null : Number(form.developerSharePercent),
      constructionStart: form.constructionStart || null,
      expectedCompletion: form.expectedCompletion || null,
      status: form.status,
      notes: form.notes || undefined,
    };
    const res = await fetch(editingId ? `/api/developers/${editingId}` : "/api/developers", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? body : { ...body, projectId: form.projectId }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
      return;
    }
    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this developer agreement?")) return;
    const res = await fetch(`/api/developers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">{editingId ? "Edit agreement" : "Add developer agreement"}</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!editingId && (
            <div>
              <Label htmlFor="da-project">Project</Label>
              <select
                id="da-project"
                className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                required
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.prefix} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="da-name">Developer name</Label>
            <Input
              id="da-name"
              value={form.developerName}
              onChange={(e) => setForm({ ...form, developerName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="da-phone">Phone</Label>
            <Input
              id="da-phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="da-email">Email</Label>
            <Input
              id="da-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="da-status">Status</Label>
            <select
              id="da-status"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as (typeof STATUSES)[number] })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="da-signed">Signed at</Label>
            <Input
              id="da-signed"
              type="date"
              value={form.signedAt}
              onChange={(e) => setForm({ ...form, signedAt: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="da-our">Our share %</Label>
            <Input
              id="da-our"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.ourSharePercent}
              onChange={(e) => setForm({ ...form, ourSharePercent: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="da-dev">Developer share %</Label>
            <Input
              id="da-dev"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.developerSharePercent}
              onChange={(e) => setForm({ ...form, developerSharePercent: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="da-start">Construction start</Label>
            <Input
              id="da-start"
              type="date"
              value={form.constructionStart}
              onChange={(e) => setForm({ ...form, constructionStart: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="da-end">Expected completion</Label>
            <Input
              id="da-end"
              type="date"
              value={form.expectedCompletion}
              onChange={(e) => setForm({ ...form, expectedCompletion: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="da-notes">Notes</Label>
            <Input
              id="da-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-3">{error}</p>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update" : "Add agreement"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div>
        <Label htmlFor="da-filter">Filter by project</Label>
        <select
          id="da-filter"
          className="mt-1 block min-w-[220px] rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prefix} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-text">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
              <tr>
                <th className="px-4 py-3">Developer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Shares</th>
                <th className="px-4 py-3">Timeline</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-text">
                    No developer agreements yet
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.developerName}</p>
                    <p className="text-xs text-muted-text">{row.contactPhone ?? row.contactEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.project.prefix} — {row.project.name}
                  </td>
                  <td className="px-4 py-3">{row.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {row.ourSharePercent != null || row.developerSharePercent != null
                      ? `Us ${row.ourSharePercent ?? "—"}% / Dev ${row.developerSharePercent ?? "—"}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-text">
                    {row.constructionStart ? new Date(row.constructionStart).toLocaleDateString() : "—"}
                    {" → "}
                    {row.expectedCompletion ? new Date(row.expectedCompletion).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
