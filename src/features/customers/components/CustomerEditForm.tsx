"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/i18n/format";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { customerStatusClass, customerStatusLabel } from "@/lib/constants/customer-status";
import { CustomerStatusSelect } from "@/features/customers/components/CustomerStatusSelect";

interface CustomerEditFormProps {
  customerId: string;
}

interface CustomerDetail {
  trackingId: string;
  fullName: string;
  phone: string;
  email: string | null;
  nid: string | null;
  address: string | null;
  status: string;
  graceStatus: string;
  isPaused: boolean;
  portalMustChangePassword: boolean;
  portalPasswordChangedAt: string | null;
  portalLoginPhone: string;
  portalLoginEmail: string | null;
  portalTemporaryPassword: string | null;
  project: { prefix: string; name: string };
  shareCount: number;
  totalPaid: number;
  remaining: number;
  enrollments: Array<{
    id: string;
    trackingId: string;
    isCurrent: boolean;
    project: { prefix: string; name: string };
    shareCount: number;
  }>;
}

export function CustomerEditForm({ customerId }: CustomerEditFormProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nid, setNid] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [isPaused, setIsPaused] = useState(false);
  const [portalPassword, setPortalPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setFullName(d.fullName);
        setPhone(d.phone);
        setEmail(d.email ?? "");
        setNid(d.nid ?? "");
        setAddress(d.address ?? "");
        setStatus(d.status);
        setIsPaused(d.isPaused ?? false);
      });
  }, [customerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        email: email || null,
        nid: nid || null,
        address: address || null,
        status,
        isPaused,
        graceStatus: isPaused ? "PAUSED" : "NONE",
        ...(portalPassword ? { portalPassword } : {}),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    router.push("/admin/customers");
    router.refresh();
  };

  if (!detail) return <FormSkeleton fields={5} />;

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <div className="mb-4 space-y-1">
          <p className="font-mono text-emerald-light">{detail.trackingId}</p>
          <p className="text-sm text-muted-text">
            {detail.project.prefix} — {detail.project.name} · {detail.shareCount} share{detail.shareCount !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-muted-text">
            Paid {formatCurrency(detail.totalPaid, "en")} · Remaining {formatCurrency(detail.remaining, "en")}
          </p>
          <p className={`text-xs ${detail.portalMustChangePassword ? "text-gold" : "text-emerald"}`}>
            Portal password: {detail.portalMustChangePassword ? "Not changed yet (temporary)" : "Changed by customer"}
          </p>
          {detail.portalMustChangePassword && detail.portalTemporaryPassword && (
            <div className="mt-3 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm">
              <p className="font-medium text-gold">Portal login (visible until customer changes password)</p>
              <div className="mt-2 space-y-1 font-mono text-xs">
                <p>Phone: {detail.portalLoginPhone}</p>
                {detail.portalLoginEmail && <p>Email: {detail.portalLoginEmail}</p>}
                <p>Password: {detail.portalTemporaryPassword}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nid">NID</Label>
              <Input id="nid" value={nid} onChange={(e) => setNid(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            {detail.status === "TRANSFERRED" ? (
              <p className="mt-1">
                <span className={`rounded px-2 py-0.5 text-sm ${customerStatusClass(detail.status)}`}>
                  {customerStatusLabel(detail.status)}
                </span>
                <span className="ml-2 text-xs text-muted-text">System-managed after share transfer</span>
              </p>
            ) : (
              <CustomerStatusSelect id="status" value={status} onChange={setStatus} />
            )}
          </div>

          <div className="rounded-lg border border-card-border bg-surface-alt/40 p-4">
            <p className="text-sm font-medium">Grace period (Shariah — no late fines)</p>
            <p className="mt-1 text-xs text-muted-text">
              Pause installment cycles for customers facing hardship. Overdue marking is skipped while paused.
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPaused}
                onChange={(e) => setIsPaused(e.target.checked)}
                disabled={detail.status === "TRANSFERRED"}
              />
              Pause payment cycle (grace period)
            </label>
            {isPaused && (
              <p className="mt-2 text-xs text-gold">Customer status will be set to PAUSED until resumed.</p>
            )}
          </div>

          <div>
            <Label htmlFor="portalPassword">Portal password</Label>
            <Input
              id="portalPassword"
              type="password"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
              placeholder="Set or reset customer portal password"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-muted-text">Leave blank to keep the current password.</p>
            <p className="mt-1 text-xs text-muted-text">
              Setting a new password here marks it as temporary and forces customer to change on next login.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>

      {detail.enrollments.length > 1 && (
        <Card>
          <h3 className="mb-3 font-medium">All project enrollments</h3>
          <div className="space-y-2">
            {detail.enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2 text-sm">
                <div>
                  <p className="font-mono text-emerald-light">{e.trackingId}</p>
                  <p className="text-muted-text">{e.project.prefix} — {e.project.name}</p>
                  <p className="text-xs text-muted-text">{e.shareCount} share{e.shareCount !== 1 ? "s" : ""}</p>
                </div>
                {!e.isCurrent && (
                  <Link href={`/admin/customers/${e.id}/edit`}>
                    <Button size="sm" variant="ghost">Open</Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
