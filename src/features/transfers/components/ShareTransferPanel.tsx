"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { customerStatusLabel } from "@/lib/constants/customer-status";

interface CustomerOption {
  id: string;
  trackingId: string;
  fullName: string;
  phone: string;
  status: string;
  shareCount: number;
  project: { prefix: string; name: string };
  shareAllocations: { share: { id: string; shareNumber: number } }[];
}

interface ProfileMatch {
  fullName: string;
  phone: string;
  email?: string;
  nid?: string;
  address?: string;
  enrollments: Array<{
    trackingId: string;
    shareCount: number;
    project: { prefix: string; name: string };
  }>;
}

interface SuccessorForm {
  fullName: string;
  phone: string;
  email: string;
  nid: string;
  address: string;
}

export function ShareTransferPanel() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [fromCustomerId, setFromCustomerId] = useState("");
  const [shareId, setShareId] = useState("");
  const [cutoff, setCutoff] = useState(12);
  const [successor, setSuccessor] = useState<SuccessorForm>({
    fullName: "",
    phone: "",
    email: "",
    nid: "",
    address: "",
  });
  const [successorSearch, setSuccessorSearch] = useState("");
  const [suggestions, setSuggestions] = useState<CustomerOption[]>([]);
  const [profileMatch, setProfileMatch] = useState<ProfileMatch | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCustomers = useCallback(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((list: CustomerOption[]) => setCustomers(list));
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const selected = customers.find((c) => c.id === fromCustomerId);
  const shares = selected?.shareAllocations.map((a) => a.share) ?? [];
  const normalizePhone = (phone: string) => phone.replace(/\s/g, "").replace(/^\+88/, "");

  const buyerInSameProject =
    selected && successor.phone.length >= 6
      ? customers.find(
          (c) =>
            c.id !== fromCustomerId &&
            normalizePhone(c.phone) === normalizePhone(successor.phone) &&
            c.project.prefix === selected.project.prefix &&
            ["ACTIVE", "PAUSED", "SHARE_TO_SELL"].includes(c.status),
        )
      : undefined;

  // Suggest existing people when searching successor (exclude source customer)
  useEffect(() => {
    if (isNewPerson || successorSearch.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = successorSearch.toLowerCase();
    const matches = customers
      .filter((c) => c.id !== fromCustomerId)
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.trackingId.toLowerCase().includes(q),
      )
      .slice(0, 8);
    setSuggestions(matches);
  }, [successorSearch, customers, fromCustomerId, isNewPerson]);

  // Phone lookup links to customer profile (same as enroll form)
  useEffect(() => {
    if (isNewPerson || successor.phone.length < 6) {
      setProfileMatch(null);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/profiles?phone=${encodeURIComponent(successor.phone)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data) {
            setProfileMatch(null);
            return;
          }
          setProfileMatch(data);
          setSuccessor((s) => ({
            ...s,
            fullName: data.fullName,
            email: data.email ?? "",
            nid: data.nid ?? "",
            address: data.address ?? "",
          }));
        });
    }, 400);
    return () => clearTimeout(t);
  }, [successor.phone, isNewPerson]);

  const pickSuggestion = (c: CustomerOption) => {
    setSuccessor({
      fullName: c.fullName,
      phone: c.phone,
      email: "",
      nid: "",
      address: "",
    });
    setSuccessorSearch(`${c.fullName} (${c.phone})`);
    setSuggestions([]);
    setIsNewPerson(false);
  };

  const startNewPerson = () => {
    setIsNewPerson(true);
    setSuccessor({ fullName: "", phone: "", email: "", nid: "", address: "" });
    setSuccessorSearch("");
    setSuggestions([]);
    setProfileMatch(null);
  };

  const submit = async () => {
    setMessage("");
    setError("");
    if (!fromCustomerId || !shareId) {
      setError("Select source customer and share");
      return;
    }
    if (!successor.fullName || !successor.phone) {
      setError("Successor name and phone are required");
      return;
    }
    const res = await fetch("/api/shares/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromCustomerId,
        shareId,
        cutoffInstallment: cutoff,
        successor: {
          fullName: successor.fullName,
          phone: successor.phone,
          email: successor.email || undefined,
          nid: successor.nid || undefined,
          address: successor.address || undefined,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Transfer failed");
      return;
    }
    setMessage(
      data.merged
        ? `Transfer complete. Added to existing enrollment ${data.toCustomer.trackingId} — now ${data.toCustomer.shareCount} share${data.toCustomer.shareCount !== 1 ? "s" : ""} in ${selected?.project.prefix}.`
        : `Transfer complete. New enrollment created: ${data.toCustomer.trackingId}`,
    );
    loadCustomers();
  };

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted-text">
        Transfer one share within the same project. If the buyer already has shares in that project, they are merged into one enrollment row with combined paid and remaining amounts.
      </p>

      <div className="space-y-4 rounded-xl border border-card-border bg-surface p-6">
        <h3 className="text-sm font-medium text-emerald">1. Source (seller)</h3>
        <div>
          <Label>Source customer</Label>
          <select
            className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            value={fromCustomerId}
            onChange={(e) => {
              setFromCustomerId(e.target.value);
              setShareId("");
            }}
          >
            <option value="">Select customer</option>
            {customers
              .filter((c) => c.status === "ACTIVE" && c.shareCount > 0)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trackingId} — {c.fullName} ({c.project.prefix}, {c.shareCount} share{c.shareCount !== 1 ? "s" : ""})
                </option>
              ))}
          </select>
        </div>
        {shares.length > 0 && (
          <div>
            <Label>Share to transfer</Label>
            <select
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
              value={shareId}
              onChange={(e) => setShareId(e.target.value)}
            >
              <option value="">Select share slot</option>
              {shares.map((s) => (
                <option key={s.id} value={s.id}>
                  Share slot #{s.shareNumber} (internal)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-text">
              One share per transfer. Customer holds {selected?.shareCount} share{selected?.shareCount !== 1 ? "s" : ""} total.
            </p>
          </div>
        )}
        <div>
          <Label>Cutoff installment (last month seller is responsible for)</Label>
          <Input type="number" min={0} value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} />
          <p className="mt-1 text-xs text-muted-text">
            Unpaid months after month {cutoff} move to the successor.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-card-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gold">2. Successor (buyer)</h3>
          <Button type="button" size="sm" variant="ghost" onClick={startNewPerson}>
            + New person
          </Button>
        </div>

        {!isNewPerson && (
          <div className="relative">
            <Label htmlFor="successorSearch">Search existing customer</Label>
            <Input
              id="successorSearch"
              placeholder="Name, phone, or tracking ID"
              value={successorSearch}
              onChange={(e) => setSuccessorSearch(e.target.value)}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-card-border bg-surface shadow-lg">
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-alt"
                      onClick={() => pickSuggestion(c)}
                    >
                      <span className="font-medium">{c.fullName}</span>
                      <span className="ml-2 text-xs text-muted-text">{c.phone}</span>
                      <span className="ml-2 text-xs text-emerald">{c.project.prefix}</span>
                      <span className="ml-1 text-xs text-muted-text">({customerStatusLabel(c.status)})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {buyerInSameProject && (
          <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm">
            <p className="font-medium text-gold">Will merge into existing enrollment</p>
            <p className="text-xs text-muted-text">
              {buyerInSameProject.fullName} already has {buyerInSameProject.shareCount} share
              {buyerInSameProject.shareCount !== 1 ? "s" : ""} in {selected?.project.prefix} (
              {buyerInSameProject.trackingId}). After transfer: {buyerInSameProject.shareCount + 1} shares in one row.
            </p>
          </div>
        )}

        {profileMatch && (
          <div className="rounded-lg border border-emerald/30 bg-emerald/10 p-3 text-sm">
            <p className="font-medium text-emerald">Existing profile found</p>
            <p className="text-xs text-muted-text">This phone is already in the system:</p>
            <ul className="mt-1 list-inside list-disc text-xs text-muted-text">
              {profileMatch.enrollments.map((e) => (
                <li key={e.trackingId}>
                  {e.project.prefix} — {e.trackingId} ({e.shareCount} share{e.shareCount !== 1 ? "s" : ""})
                </li>
              ))}
            </ul>
            {!buyerInSameProject && (
              <p className="mt-2 text-xs text-muted-text">
                {selected
                  ? `No enrollment in ${selected.project.prefix} yet — a new enrollment will be created for this project.`
                  : "Select a source customer to see merge behavior."}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input
              value={successor.fullName}
              onChange={(e) => setSuccessor({ ...successor, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={successor.phone}
              onChange={(e) => setSuccessor({ ...successor, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={successor.email}
              onChange={(e) => setSuccessor({ ...successor, email: e.target.value })}
            />
          </div>
          <div>
            <Label>NID</Label>
            <Input value={successor.nid} onChange={(e) => setSuccessor({ ...successor, nid: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Address</Label>
          <Input value={successor.address} onChange={(e) => setSuccessor({ ...successor, address: e.target.value })} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald">{message}</p>}
      <Button onClick={submit}>Execute transfer</Button>
    </div>
  );
}
