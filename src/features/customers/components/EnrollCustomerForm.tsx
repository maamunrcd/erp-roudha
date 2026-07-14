"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { PricingPhase } from "@/lib/constants/projects";
import { getPhaseForShare } from "@/lib/constants/projects";
import { calculateBookingQuote, phaseToPricing } from "@/lib/services/pricing.service";
import { formatCurrency } from "@/lib/i18n/format";

interface EnrollCustomerFormProps {
  projectId: string;
  projectPrefix?: string;
  availableShareCount: number;
  pricingConfigured?: boolean;
  redirectTo?: string;
  initialFullName?: string;
  initialPhone?: string;
  leadId?: string;
  initialSalesAgentId?: string;
}

interface ExistingProfile {
  fullName: string;
  phone: string;
  email?: string;
  nid?: string;
  address?: string;
  enrollments: Array<{
    trackingId: string;
    shareCount: number;
    project: { id: string; prefix: string; name: string };
  }>;
}

interface ProjectPricing {
  installmentMonths: number;
  pricingPhases: PricingPhase[];
}

interface PortalCredentials {
  loginPhone: string;
  loginEmail?: string | null;
  temporaryPassword: string;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function estimateStandardQuote(
  shareCount: number,
  phases: PricingPhase[],
  installmentMonths: number,
  useComboOffer: boolean,
) {
  if (!phases.length || shareCount < 1) return null;
  const phase = getPhaseForShare(1, phases);
  if (!phase) return null;
  return calculateBookingQuote(
    shareCount,
    phaseToPricing(phase),
    true,
    installmentMonths,
    useComboOffer,
  );
}

export function EnrollCustomerForm({
  projectId,
  projectPrefix,
  availableShareCount,
  pricingConfigured = true,
  redirectTo = "/admin/projects",
  initialFullName = "",
  initialPhone = "",
  leadId,
  initialSalesAgentId = "",
}: EnrollCustomerFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");
  const [nid, setNid] = useState("");
  const [address, setAddress] = useState("");
  const [shareCount, setShareCount] = useState(1);
  const [paymentPlan, setPaymentPlan] = useState("INSTALLMENT");
  const [pricingMode, setPricingMode] = useState("STANDARD");
  const [useComboOffer, setUseComboOffer] = useState(false);
  const [pricePerShare, setPricePerShare] = useState("");
  const [totalDownpayment, setTotalDownpayment] = useState("");
  const [monthlyTotal, setMonthlyTotal] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState("");
  const [contractStartDate, setContractStartDate] = useState(todayInputValue);
  const [discountReason, setDiscountReason] = useState("");
  const [salesAgentId, setSalesAgentId] = useState(initialSalesAgentId);
  const [agents, setAgents] = useState<Array<{ id: string; fullName: string; defaultCommissionPct: number }>>([]);
  const [projectPricing, setProjectPricing] = useState<ProjectPricing | null>(null);
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalCredentials, setPortalCredentials] = useState<PortalCredentials | null>(null);
  const [createdTrackingId, setCreatedTrackingId] = useState<string | null>(null);

  const effectiveMonths = Number(installmentMonths) || projectPricing?.installmentMonths || 48;

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.project) {
          setProjectPricing({
            installmentMonths: data.project.installmentMonths,
            pricingPhases: data.project.pricingPhases ?? [],
          });
        }
      });
    fetch("/api/sales-agents?active=1")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(
            data.map((a: { id: string; fullName: string; defaultCommissionPct: number }) => ({
              id: a.id,
              fullName: a.fullName,
              defaultCommissionPct: a.defaultCommissionPct,
            })),
          );
        }
      });
  }, [projectId]);

  const standardQuote = useMemo(() => {
    if (!projectPricing) return null;
    return estimateStandardQuote(
      shareCount,
      projectPricing.pricingPhases,
      effectiveMonths,
      useComboOffer,
    );
  }, [projectPricing, shareCount, effectiveMonths, useComboOffer]);

  const phaseRef = useMemo(() => {
    if (!projectPricing?.pricingPhases.length) return null;
    return getPhaseForShare(1, projectPricing.pricingPhases);
  }, [projectPricing]);

  useEffect(() => {
    if (pricingMode !== "CUSTOM" || !standardQuote) return;
    if (!pricePerShare) setPricePerShare(String(standardQuote.pricePerShare));
  }, [pricingMode, standardQuote, pricePerShare]);

  const contractSummary = useMemo(() => {
    if (pricingMode === "CUSTOM") {
      const perShare = Number(pricePerShare) || 0;
      const total = perShare * shareCount;
      const downpayment = Number(totalDownpayment) || 0;
      const monthly =
        Number(monthlyTotal) ||
        (effectiveMonths > 0 && total > downpayment
          ? Math.round((total - downpayment) / effectiveMonths)
          : 0);
      return { total, downpayment, monthly, pricePerShare: perShare };
    }
    if (!standardQuote) return null;
    const downpayment = totalDownpayment !== "" ? Number(totalDownpayment) : standardQuote.downpayment;
    const monthly =
      monthlyTotal !== ""
        ? Number(monthlyTotal)
        : effectiveMonths > 0
          ? Math.round((standardQuote.totalPrice - downpayment) / effectiveMonths)
          : standardQuote.monthlyInstallment;
    return {
      total: standardQuote.totalPrice,
      downpayment,
      monthly,
      pricePerShare: standardQuote.pricePerShare,
    };
  }, [
    pricingMode,
    pricePerShare,
    shareCount,
    totalDownpayment,
    monthlyTotal,
    effectiveMonths,
    standardQuote,
  ]);

  const lookupPhone = async (value: string) => {
    if (value.length < 6) {
      setExistingProfile(null);
      return;
    }
    const res = await fetch(`/api/profiles?phone=${encodeURIComponent(value)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) {
      setExistingProfile(null);
      return;
    }
    setExistingProfile(data);
    setFullName(data.fullName);
    setEmail(data.email ?? "");
    setNid(data.nid ?? "");
    setAddress(data.address ?? "");
  };

  useEffect(() => {
    const t = setTimeout(() => lookupPhone(phone), 400);
    return () => clearTimeout(t);
  }, [phone]);

  const enrollmentInThisProject = existingProfile?.enrollments.find((e) => e.project.id === projectId);
  const prefix = projectPrefix ?? enrollmentInThisProject?.project.prefix ?? "this project";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shareCount < 1) {
      setError("Enter at least 1 share");
      return;
    }
    if (shareCount > availableShareCount) {
      setError(`Only ${availableShareCount} share(s) available`);
      return;
    }
    if (!contractSummary) {
      setError("Unable to calculate contract terms");
      return;
    }
    if (pricingMode === "CUSTOM" && (!pricePerShare || Number(pricePerShare) <= 0)) {
      setError("Enter a custom price per share");
      return;
    }
    if (contractSummary.downpayment > contractSummary.total) {
      setError("Downpayment cannot exceed total price");
      return;
    }

    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      projectId,
      shareCount,
      fullName,
      phone,
      email: email || undefined,
      nid: nid || undefined,
      address: address || undefined,
      paymentPlan,
      pricingMode,
      useComboOffer: pricingMode === "STANDARD" ? useComboOffer : false,
      contractStartDate,
      customDownpayment: contractSummary.downpayment,
      ...(salesAgentId ? { salesAgentId } : {}),
      ...(leadId ? { leadId } : {}),
    };

    if (installmentMonths && Number(installmentMonths) !== projectPricing?.installmentMonths) {
      body.customInstallmentMonths = Number(installmentMonths);
    }
    if (monthlyTotal) body.customMonthlyAmount = contractSummary.monthly;
    if (discountReason.trim()) body.discountReason = discountReason.trim();

    if (pricingMode === "CUSTOM") {
      body.customTotalPrice = contractSummary.total;
    }

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Enrollment failed");
      return;
    }
    setCreatedTrackingId(data.customer?.trackingId ?? null);
    setPortalCredentials(data.portalCredentials ?? null);

    if (leadId && data.customer?.id) {
      await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: data.customer.id }),
      });
    }

    if (!data.portalCredentials) {
      router.push(redirectTo);
      router.refresh();
    }
  };

  if (portalCredentials) {
    return (
      <Card className="max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold text-emerald">Customer Enrolled Successfully</h2>
        {createdTrackingId && <p className="text-sm text-muted-text">Tracking ID: <span className="font-mono text-emerald-light">{createdTrackingId}</span></p>}
        <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm space-y-2">
          <p className="font-medium text-gold">Portal temporary credentials (show once)</p>
          <p>Login phone: <span className="font-mono">{portalCredentials.loginPhone}</span></p>
          {portalCredentials.loginEmail && <p>Login email: <span className="font-mono">{portalCredentials.loginEmail}</span></p>}
          <p>Temporary password: <span className="font-mono">{portalCredentials.temporaryPassword}</span></p>
          <p className="text-xs text-muted-text">Customer must change this password on first login.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { router.push(redirectTo); router.refresh(); }}>Done</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      {!pricingConfigured && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          Configure{" "}
          <Link href={`/admin/projects/${projectId}/edit`} className="underline hover:text-red-300">
            project pricing phases
          </Link>{" "}
          first (one-share and twin/combo rates).
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-muted-text">
          Project pricing sets default rates. Each customer can have their own start date, installment period,
          downpayment, and negotiated share price.
        </p>

        {enrollmentInThisProject && (
          <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm">
            <p className="font-medium text-gold">Adding shares to {enrollmentInThisProject.trackingId}</p>
            <p className="text-xs text-muted-text">
              New shares use the contract terms below and merge into the existing enrollment.
            </p>
          </div>
        )}

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
          <div className="md:col-span-2">
            <Label htmlFor="salesAgent">Sales agent (for commission)</Label>
            <Select id="salesAgent" value={salesAgentId} onChange={(e) => setSalesAgentId(e.target.value)}>
              <option value="">None</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} ({a.defaultCommissionPct}%)
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="shareCount">Shares</Label>
            <Input
              id="shareCount"
              type="number"
              min={1}
              max={availableShareCount || 1}
              value={shareCount}
              onChange={(e) => setShareCount(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="contractStartDate">Contract start date</Label>
            <Input
              id="contractStartDate"
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="installmentMonths">
              Installment months
              {projectPricing && (
                <span className="ml-1 text-xs font-normal text-muted-text">
                  (project default: {projectPricing.installmentMonths})
                </span>
              )}
            </Label>
            <Input
              id="installmentMonths"
              type="number"
              min={1}
              max={120}
              placeholder={projectPricing ? String(projectPricing.installmentMonths) : "48"}
              value={installmentMonths}
              onChange={(e) => setInstallmentMonths(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-card-border bg-surface-alt/40 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="pricingMode">Share pricing</Label>
              <Select
                id="pricingMode"
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value)}
              >
                <option value="STANDARD">Standard (from project phases)</option>
                <option value="CUSTOM">Custom (negotiated per customer)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentPlan">Payment plan</Label>
              <Select id="paymentPlan" value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)}>
                <option value="INSTALLMENT">Installment</option>
                <option value="FULL_UPFRONT">Full upfront</option>
              </Select>
            </div>
          </div>

          {pricingMode === "STANDARD" && phaseRef && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-text">
                Phase rates: one share {formatCurrency(phaseRef.singlePrice, "en")} · twin/combo per share{" "}
                {formatCurrency(phaseRef.twinComboPrice, "en")}
              </p>
              {shareCount >= 2 && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useComboOffer}
                    onChange={(e) => setUseComboOffer(e.target.checked)}
                    className="rounded border-card-border"
                  />
                  <span>Apply twin/combo rate for this customer</span>
                </label>
              )}
              {shareCount >= 2 && !useComboOffer && (
                <p className="text-xs text-gold">
                  Without combo offer, each share is charged at the one-share rate (
                  {formatCurrency(phaseRef.singlePrice, "en")}).
                </p>
              )}
            </div>
          )}

          {pricingMode === "CUSTOM" && (
            <div>
              <Label htmlFor="pricePerShare">Agreed price per share</Label>
              <Input
                id="pricePerShare"
                type="number"
                min={1}
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-card-border bg-surface-alt/40 p-4">
          <h3 className="text-sm font-medium text-gold">Payment terms (this customer)</h3>
          <p className="text-xs text-muted-text">
            Downpayment is flexible — enter any agreed amount (e.g. ৳50,000, ৳70,000, ৳1,50,000). Remaining
            balance is spread over the installment months above.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="totalDownpayment">Total downpayment</Label>
              <Input
                id="totalDownpayment"
                type="number"
                min={0}
                placeholder={
                  standardQuote ? String(standardQuote.downpayment) : "Agreed amount"
                }
                value={totalDownpayment}
                onChange={(e) => setTotalDownpayment(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthlyTotal">Monthly installment (total)</Label>
              <Input
                id="monthlyTotal"
                type="number"
                min={0}
                placeholder="Auto from remaining ÷ months"
                value={monthlyTotal}
                onChange={(e) => setMonthlyTotal(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="discountReason">Notes / reason</Label>
              <Input
                id="discountReason"
                placeholder="e.g. Early bird, staff discount"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
          </div>

          {contractSummary && (
            <div className="rounded-lg border border-emerald/30 bg-emerald/10 p-3 text-sm">
              <p className="font-medium text-emerald">Contract summary</p>
              <div className="mt-1 grid gap-1 text-xs text-muted-text md:grid-cols-2">
                <span>Start: {contractStartDate}</span>
                <span>Duration: {effectiveMonths} months</span>
                <span>Rate: {formatCurrency(contractSummary.pricePerShare, "en")}/share</span>
                <span>Total: {formatCurrency(contractSummary.total, "en")}</span>
                <span>Downpayment: {formatCurrency(contractSummary.downpayment, "en")}</span>
                <span>Monthly: {formatCurrency(contractSummary.monthly, "en")}</span>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || availableShareCount < 1 || !pricingConfigured}>
            {saving ? "Saving…" : enrollmentInThisProject ? `Add ${shareCount} share(s)` : "Enroll customer"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
