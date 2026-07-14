"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  leadSourceLabel,
  leadStatusClass,
  leadStatusLabel,
} from "@/lib/constants/lead-status";

interface ProjectOption {
  id: string;
  prefix: string;
  name: string;
}

interface AgentOption {
  id: string;
  fullName: string;
}

interface LeadRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  interestNotes: string | null;
  nextFollowUpAt: string | null;
  siteVisitAt: string | null;
  siteVisitNotes: string | null;
  project: ProjectOption | null;
  salesAgent: AgentOption | null;
  convertedCustomer: { id: string; trackingId: string } | null;
}

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  source: "PHONE",
  status: "NEW",
  interestNotes: "",
  projectId: "",
  salesAgentId: "",
  nextFollowUpAt: "",
  siteVisitAt: "",
  siteVisitNotes: "",
};

export function LeadPanel() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const [leadRes, projRes, agentRes] = await Promise.all([
      fetch(`/api/leads?${params}`),
      fetch("/api/projects"),
      fetch("/api/sales-agents?active=1"),
    ]);
    if (leadRes.ok) {
      const data = await leadRes.json();
      setLeads(Array.isArray(data) ? data : []);
    }
    if (projRes.ok) {
      const data = await projRes.json();
      setProjects(
        (Array.isArray(data) ? data : []).map((p: ProjectOption) => ({
          id: p.id,
          prefix: p.prefix,
          name: p.name,
        })),
      );
    }
    if (agentRes.ok) {
      const data = await agentRes.json();
      setAgents(
        (Array.isArray(data) ? data : []).map((a: AgentOption) => ({
          id: a.id,
          fullName: a.fullName,
        })),
      );
    }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function startEdit(lead: LeadRow) {
    setEditingId(lead.id);
    setForm({
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email ?? "",
      source: lead.source,
      status: lead.status,
      interestNotes: lead.interestNotes ?? "",
      projectId: lead.project?.id ?? "",
      salesAgentId: lead.salesAgent?.id ?? "",
      nextFollowUpAt: lead.nextFollowUpAt?.slice(0, 16) ?? "",
      siteVisitAt: lead.siteVisitAt?.slice(0, 16) ?? "",
      siteVisitNotes: lead.siteVisitNotes ?? "",
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
      fullName: form.fullName,
      phone: form.phone,
      email: form.email || undefined,
      source: form.source,
      status: form.status,
      interestNotes: form.interestNotes || undefined,
      projectId: form.projectId || null,
      salesAgentId: form.salesAgentId || null,
      nextFollowUpAt: form.nextFollowUpAt || null,
      siteVisitAt: form.siteVisitAt || null,
      siteVisitNotes: form.siteVisitNotes || null,
    };
    const res = await fetch(editingId ? `/api/leads/${editingId}` : "/api/leads", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    if (!confirm("Delete this lead?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
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
        <CardTitle className="mb-4">{editingId ? "Edit lead" : "Add lead"}</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="lead-name">Full name</Label>
            <Input
              id="lead-name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="lead-phone">Phone</Label>
            <Input
              id="lead-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lead-source">Source</Label>
            <select
              id="lead-source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              {LEAD_SOURCE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-status">Status</Label>
            <select
              id="lead-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              {LEAD_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-project">Interested project</Label>
            <select
              id="lead-project"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              <option value="">Any / not set</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prefix} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-agent">Sales agent</Label>
            <select
              id="lead-agent"
              value={form.salesAgentId}
              onChange={(e) => setForm({ ...form, salesAgentId: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="lead-followup">Next follow-up</Label>
            <Input
              id="lead-followup"
              type="datetime-local"
              value={form.nextFollowUpAt}
              onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lead-visit">Site visit</Label>
            <Input
              id="lead-visit"
              type="datetime-local"
              value={form.siteVisitAt}
              onChange={(e) => setForm({ ...form, siteVisitAt: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="lead-notes">Interest / visit notes</Label>
            <Input
              id="lead-notes"
              value={form.interestNotes}
              onChange={(e) => setForm({ ...form, interestNotes: e.target.value })}
              placeholder="Preferred share count, budget, etc."
            />
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-3">{error}</p>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update lead" : "Add lead"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {LEAD_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px]">
          <Label htmlFor="filter-search">Search</Label>
          <Input
            id="filter-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or phone"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-text">
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-text">
                  No leads yet.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.fullName}</p>
                    <p className="text-xs text-muted-text">{lead.phone}</p>
                  </td>
                  <td className="px-4 py-3">{leadSourceLabel(lead.source)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${leadStatusClass(lead.status)}`}>
                      {leadStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-text">
                    {lead.project ? lead.project.prefix : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-text">
                    {lead.nextFollowUpAt
                      ? new Date(lead.nextFollowUpAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(lead)}
                        className="text-xs text-emerald hover:underline"
                      >
                        Edit
                      </button>
                      {lead.status !== "CONVERTED" && lead.status !== "LOST" && lead.project && (
                        <Link
                          href={`/admin/projects/${lead.project.id}/customers/new?leadId=${lead.id}&name=${encodeURIComponent(lead.fullName)}&phone=${encodeURIComponent(lead.phone)}${lead.salesAgent ? `&agentId=${lead.salesAgent.id}` : ""}`}
                          className="text-xs text-gold hover:underline"
                        >
                          Enroll
                        </Link>
                      )}
                      {lead.convertedCustomer && (
                        <Link
                          href={`/admin/customers/${lead.convertedCustomer.id}/edit`}
                          className="text-xs text-emerald-light hover:underline"
                        >
                          {lead.convertedCustomer.trackingId}
                        </Link>
                      )}
                      {lead.status !== "CONVERTED" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(lead.id)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
