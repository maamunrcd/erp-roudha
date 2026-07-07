"use client";

import type { PricingPhase } from "@/lib/constants/projects";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { createPricingPhase, normalizePricingPhases } from "@/lib/utils/pricing-phases";
import { formatCurrency } from "@/lib/i18n/format";

interface PricingPhasesEditorProps {
  phases: PricingPhase[];
  installmentMonths: number;
  totalShares: number;
  onChange: (phases: PricingPhase[]) => void;
}

export function PricingPhasesEditor({
  phases,
  installmentMonths,
  totalShares,
  onChange,
}: PricingPhasesEditorProps) {
  const updatePhase = (index: number, patch: Partial<PricingPhase>) => {
    const next = phases.map((phase, i) => (i === index ? { ...phase, ...patch } : phase));
    onChange(normalizePricingPhases(next, installmentMonths));
  };

  const addPhase = () => {
    const last = phases[phases.length - 1];
    const shareFrom = last ? last.shareTo + 1 : 1;
    const shareTo = totalShares > 0 ? Math.min(shareFrom + 19, totalShares) : shareFrom + 19;
    onChange([
      ...phases,
      createPricingPhase(phases.length + 1, shareFrom, shareTo, installmentMonths),
    ]);
  };

  const removePhase = (index: number) => {
    onChange(normalizePricingPhases(
      phases.filter((_, i) => i !== index),
      installmentMonths,
    ));
  };

  const fillAllShares = () => {
    if (totalShares <= 0) return;
    onChange([createPricingPhase(1, 1, totalShares, installmentMonths)]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-text">
          Define price per share range. Customer enrollment uses these rates.
        </p>
        <div className="flex gap-2">
          {totalShares > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={fillAllShares}>
              One phase (1–{totalShares})
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={addPhase}>
            + Add phase
          </Button>
        </div>
      </div>

      {phases.length === 0 ? (
        <p className="rounded-lg border border-dashed border-card-border p-4 text-center text-sm text-muted-text">
          No pricing phases yet. Add at least one phase to enroll customers.
        </p>
      ) : (
        <div className="space-y-3">
          {phases.map((phase, index) => (
            <div key={index} className="rounded-lg border border-card-border bg-surface-alt/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-emerald">{phase.label}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => removePhase(index)}
                  disabled={phases.length === 1}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Phase name</Label>
                  <Input
                    value={phase.label}
                    onChange={(e) => updatePhase(index, { label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Share from</Label>
                  <Input
                    type="number"
                    min={1}
                    value={phase.shareFrom}
                    onChange={(e) => updatePhase(index, { shareFrom: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Share to</Label>
                  <Input
                    type="number"
                    min={1}
                    value={phase.shareTo}
                    onChange={(e) => updatePhase(index, { shareTo: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Downpayment / share</Label>
                  <Input
                    type="number"
                    min={0}
                    value={phase.downpayment}
                    onChange={(e) => updatePhase(index, { downpayment: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>One share price</Label>
                  <Input
                    type="number"
                    min={0}
                    value={phase.singlePrice}
                    onChange={(e) => updatePhase(index, { singlePrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Twin/combo price (per share)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={phase.twinComboPrice}
                    onChange={(e) => updatePhase(index, { twinComboPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Est. monthly (single)</Label>
                  <Input
                    readOnly
                    value={
                      installmentMonths > 0 && phase.singlePrice > 0
                        ? formatCurrency(
                            Math.round((phase.singlePrice - phase.downpayment) / installmentMonths),
                            "en",
                          )
                        : "—"
                    }
                    className="text-muted-text"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-text">{phase.shares}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
