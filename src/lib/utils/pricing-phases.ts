import type { PricingPhase } from "@/lib/constants/projects";

export function createPricingPhase(
  id: number,
  shareFrom: number,
  shareTo: number,
  installmentMonths: number,
): PricingPhase {
  return {
    id,
    label: `Phase ${id}`,
    shares: `Shares ${shareFrom}–${shareTo}`,
    shareFrom,
    shareTo,
    singlePrice: 0,
    twinComboPrice: 0,
    downpayment: 0,
    monthly: 0,
  };
}

export function normalizePricingPhases(
  phases: PricingPhase[],
  installmentMonths: number,
): PricingPhase[] {
  return phases.map((phase, index) => {
    const shareFrom = Math.max(1, Math.floor(phase.shareFrom));
    const shareTo = Math.max(shareFrom, Math.floor(phase.shareTo));
    const singlePrice = Math.max(0, phase.singlePrice);
    const downpayment = Math.max(0, phase.downpayment);
    const monthly =
      installmentMonths > 0
        ? Math.round((singlePrice - downpayment) / installmentMonths)
        : 0;

    return {
      id: index + 1,
      label: phase.label.trim() || `Phase ${index + 1}`,
      shares: `Shares ${shareFrom}–${shareTo}`,
      shareFrom,
      shareTo,
      singlePrice,
      twinComboPrice: Math.max(0, phase.twinComboPrice),
      downpayment,
      monthly,
    };
  });
}

export function validatePricingPhases(
  phases: PricingPhase[],
  totalShares: number,
): string | null {
  if (!phases.length) return null;

  for (const phase of phases) {
    if (phase.shareFrom > phase.shareTo) {
      return `${phase.label}: share range start must be ≤ end.`;
    }
    if (phase.singlePrice <= 0 || phase.twinComboPrice <= 0) {
      return `${phase.label}: single and twin prices must be greater than zero.`;
    }
    if (phase.downpayment < 0) {
      return `${phase.label}: downpayment cannot be negative.`;
    }
  }

  const sorted = [...phases].sort((a, b) => a.shareFrom - b.shareFrom);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].shareFrom <= sorted[i - 1].shareTo) {
      return `Pricing phases overlap between ${sorted[i - 1].label} and ${sorted[i].label}.`;
    }
  }

  if (totalShares > 0) {
    const maxShare = Math.max(...phases.map((p) => p.shareTo));
    if (maxShare > totalShares) {
      return `A pricing phase ends at share ${maxShare}, but the project only has ${totalShares} shares.`;
    }
  }

  return null;
}

export function suggestPhasesForShares(totalShares: number, installmentMonths: number): PricingPhase[] {
  if (totalShares <= 0) return [];
  return [createPricingPhase(1, 1, totalShares, installmentMonths)];
}
