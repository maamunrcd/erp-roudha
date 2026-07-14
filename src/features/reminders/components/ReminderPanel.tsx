"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { REMINDER_TYPE_OPTIONS, reminderTypeLabel } from "@/lib/constants/reminder-types";
import { formatCurrency } from "@/lib/i18n/format";

interface ReminderRow {
  id: string;
  title: string;
  type: string;
  status: string;
  dueAt: string;
  notes: string | null;
  lead: { id: string; fullName: string; phone: string } | null;
  customer: { id: string; trackingId: string; fullName: string } | null;
}

interface InboxPayload {
  reminders: ReminderRow[];
  installmentDues: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    amountDue: number;
    customer: { id: string; trackingId: string; fullName: string; phone: string };
  }>;
  leadFollowUps: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    lead: { id: string; fullName: string; phone: string; status: string };
  }>;
}

const emptyForm = {
  title: "",
  type: "FOLLOW_UP",
  dueAt: "",
  notes: "",
};

export function ReminderPanel() {
  const [inbox, setInbox] = useState<InboxPayload | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/reminders?inbox=1");
    if (res.ok) setInbox(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        type: form.type,
        dueAt: form.dueAt,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create reminder");
      return;
    }
    setForm(emptyForm);
    await load();
  }

  async function markDone(id: string) {
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this reminder?")) return;
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">Create reminder</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label htmlFor="rem-title">Title</Label>
            <Input
              id="rem-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="rem-type">Type</Label>
            <select
              id="rem-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              {REMINDER_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="rem-due">Due at</Label>
            <Input
              id="rem-due"
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Label htmlFor="rem-notes">Notes</Label>
            <Input
              id="rem-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-4">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add reminder"}
            </Button>
          </div>
        </form>
      </Card>

      {loading || !inbox ? (
        <p className="text-sm text-muted-text">Loading inbox…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardTitle className="mb-3">Manual reminders</CardTitle>
            {inbox.reminders.length === 0 ? (
              <p className="text-sm text-muted-text">None pending.</p>
            ) : (
              <ul className="space-y-3">
                {inbox.reminders.map((r) => (
                  <li key={r.id} className="rounded-lg border border-card-border p-3 text-sm">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-text">
                      {reminderTypeLabel(r.type)} · {new Date(r.dueAt).toLocaleString()}
                    </p>
                    {r.customer && (
                      <Link
                        href={`/admin/customers/${r.customer.id}/edit`}
                        className="text-xs text-emerald hover:underline"
                      >
                        {r.customer.trackingId}
                      </Link>
                    )}
                    {r.lead && (
                      <p className="text-xs text-muted-text">
                        Lead: {r.lead.fullName} ({r.lead.phone})
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => markDone(r.id)}
                        className="text-xs text-emerald hover:underline"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3">Installment / downpayment dues</CardTitle>
            {inbox.installmentDues.length === 0 ? (
              <p className="text-sm text-muted-text">No overdue payments.</p>
            ) : (
              <ul className="space-y-3">
                {inbox.installmentDues.map((row) => (
                  <li key={row.id} className="rounded-lg border border-card-border p-3 text-sm">
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-gold">{formatCurrency(row.amountDue, "en")}</p>
                    <Link
                      href={`/admin/customers/${row.customer.id}/edit`}
                      className="text-xs text-emerald hover:underline"
                    >
                      {row.customer.trackingId} — {row.customer.fullName}
                    </Link>
                    {row.dueAt && (
                      <p className="text-xs text-muted-text">
                        Due {new Date(row.dueAt).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3">Lead follow-ups due</CardTitle>
            {inbox.leadFollowUps.length === 0 ? (
              <p className="text-sm text-muted-text">No lead follow-ups due.</p>
            ) : (
              <ul className="space-y-3">
                {inbox.leadFollowUps.map((row) => (
                  <li key={row.id} className="rounded-lg border border-card-border p-3 text-sm">
                    <p className="font-medium">{row.lead.fullName}</p>
                    <p className="text-xs text-muted-text">{row.lead.phone}</p>
                    <Link href="/admin/leads" className="text-xs text-gold hover:underline">
                      Open leads
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
