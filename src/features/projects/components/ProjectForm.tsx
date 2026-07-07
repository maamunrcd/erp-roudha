"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { PricingPhase } from "@/lib/constants/projects";
import { PricingPhasesEditor } from "@/features/projects/components/PricingPhasesEditor";
import { normalizePricingPhases, suggestPhasesForShares, validatePricingPhases } from "@/lib/utils/pricing-phases";

export interface ProjectFormValues {
  prefix: string;
  name: string;
  nameBn?: string;
  status: string;
  installmentMonths: number;
  totalShares: number;
  publicShares: number;
  pricingPhases: PricingPhase[];
  vendorCompanyId?: string;
  landBuyPrice?: number;
  targetSellPrice?: number;
  companyPaidAmount?: number;
  dealStartDate?: string;
  dealEndDate?: string;
  acquisitionNotes?: string;
}

interface VendorOption {
  id: string;
  name: string;
}

interface ProjectFormProps {
  initial?: Partial<ProjectFormValues>;
  projectId?: string;
  mode: "create" | "edit";
}

export function ProjectForm({ initial, projectId, mode }: ProjectFormProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [newVendorName, setNewVendorName] = useState("");
  const [form, setForm] = useState<ProjectFormValues>({
    prefix: initial?.prefix ?? "",
    name: initial?.name ?? "",
    nameBn: initial?.nameBn ?? "",
    status: initial?.status ?? "PLANNING",
    installmentMonths: initial?.installmentMonths ?? 48,
    totalShares: initial?.totalShares ?? 0,
    publicShares: initial?.publicShares ?? 0,
    pricingPhases: initial?.pricingPhases ?? [],
    vendorCompanyId: initial?.vendorCompanyId ?? "",
    landBuyPrice: initial?.landBuyPrice ?? undefined,
    targetSellPrice: initial?.targetSellPrice ?? undefined,
    companyPaidAmount: initial?.companyPaidAmount ?? 0,
    dealStartDate: initial?.dealStartDate?.slice(0, 10) ?? "",
    dealEndDate: initial?.dealEndDate?.slice(0, 10) ?? "",
    acquisitionNotes: initial?.acquisitionNotes ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadVendors = () => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then(setVendors);
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const addVendor = async () => {
    if (!newVendorName.trim()) return;
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newVendorName.trim() }),
    });
    if (res.ok) {
      const vendor = await res.json();
      setNewVendorName("");
      loadVendors();
      setForm((f) => ({ ...f, vendorCompanyId: vendor.id }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhases = normalizePricingPhases(form.pricingPhases, form.installmentMonths);
    const phaseError = validatePricingPhases(normalizedPhases, form.totalShares);
    if (phaseError) {
      setError(phaseError);
      return;
    }
    setSaving(true);
    setError("");
    const url = mode === "create" ? "/api/projects" : `/api/projects/${projectId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pricingPhases: normalizedPhases,
        vendorCompanyId: form.vendorCompanyId || null,
        landBuyPrice: form.landBuyPrice ?? null,
        targetSellPrice: form.targetSellPrice ?? null,
        dealStartDate: form.dealStartDate || null,
        dealEndDate: form.dealEndDate || null,
        acquisitionNotes: form.acquisitionNotes || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save project");
      return;
    }
    router.push(`/admin/projects/${data.id}`);
    router.refresh();
  };

  const companyDue = Math.max(0, (form.landBuyPrice ?? 0) - (form.companyPaidAmount ?? 0));

  return (
    <Card className="max-w-4xl">
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-emerald">Project Details</h3>
          <div>
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              disabled={mode === "edit"}
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="nameBn">Name (Bengali)</Label>
            <Input id="nameBn" value={form.nameBn} onChange={(e) => setForm({ ...form, nameBn: e.target.value })} className="font-bengali" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="months">Installment months</Label>
              <Input
                id="months"
                type="number"
                min={1}
                value={form.installmentMonths}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  installmentMonths: Number(e.target.value),
                  pricingPhases: normalizePricingPhases(f.pricingPhases, Number(e.target.value)),
                }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalShares">Total shares</Label>
              <Input
                id="totalShares"
                type="number"
                min={0}
                value={form.totalShares}
                onChange={(e) => {
                  const totalShares = Number(e.target.value);
                  setForm((f) => ({
                    ...f,
                    totalShares,
                    publicShares: f.publicShares || totalShares,
                    pricingPhases:
                      f.pricingPhases.length === 0 && totalShares > 0
                        ? suggestPhasesForShares(totalShares, f.installmentMonths)
                        : f.pricingPhases,
                  }));
                }}
                disabled={mode === "edit"}
              />
            </div>
            <div>
              <Label htmlFor="publicShares">Public shares</Label>
              <Input
                id="publicShares"
                type="number"
                min={0}
                value={form.publicShares}
                onChange={(e) => setForm({ ...form, publicShares: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-card-border pt-4">
          <h3 className="text-sm font-medium text-emerald">Pricing phases</h3>
          <PricingPhasesEditor
            phases={form.pricingPhases}
            installmentMonths={form.installmentMonths}
            totalShares={form.totalShares}
            onChange={(pricingPhases) => setForm((f) => ({ ...f, pricingPhases }))}
          />
        </div>

        <div className="space-y-4 border-t border-card-border pt-4">
          <h3 className="text-sm font-medium text-gold">Land Company / Vendor</h3>
          <div>
            <Label htmlFor="vendor">Company (e.g. Dhaka Modern City)</Label>
            <Select
              id="vendor"
              value={form.vendorCompanyId ?? ""}
              onChange={(e) => setForm({ ...form, vendorCompanyId: e.target.value })}
            >
              <option value="">Select company</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add new company name"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
            />
            <Button type="button" variant="ghost" onClick={addVendor}>Add</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="landBuyPrice">Buy price (pay to company)</Label>
              <Input
                id="landBuyPrice"
                type="number"
                min={0}
                value={form.landBuyPrice ?? ""}
                onChange={(e) => setForm({ ...form, landBuyPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <Label htmlFor="targetSellPrice">Target sell price (total revenue)</Label>
              <Input
                id="targetSellPrice"
                type="number"
                min={0}
                value={form.targetSellPrice ?? ""}
                onChange={(e) => setForm({ ...form, targetSellPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <Label htmlFor="companyPaidAmount">Company paid so far</Label>
              <Input
                id="companyPaidAmount"
                type="number"
                min={0}
                value={form.companyPaidAmount ?? 0}
                onChange={(e) => setForm({ ...form, companyPaidAmount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Company due</Label>
              <Input value={companyDue} readOnly className="text-gold" />
            </div>
            <div>
              <Label htmlFor="dealStartDate">Deal start date</Label>
              <Input
                id="dealStartDate"
                type="date"
                value={form.dealStartDate ?? ""}
                onChange={(e) => setForm({ ...form, dealStartDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dealEndDate">Deal end date</Label>
              <Input
                id="dealEndDate"
                type="date"
                value={form.dealEndDate ?? ""}
                onChange={(e) => setForm({ ...form, dealEndDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="acquisitionNotes">Notes</Label>
            <Input
              id="acquisitionNotes"
              value={form.acquisitionNotes ?? ""}
              onChange={(e) => setForm({ ...form, acquisitionNotes: e.target.value })}
              placeholder="Payment terms, plot details, etc."
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
