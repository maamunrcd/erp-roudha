import type { PricingPhase } from "@/lib/constants/projects";
import { getPhaseForShare } from "@/lib/constants/projects";
import { PricingMode, PricingSource } from "@prisma/client";

export interface PhasePricing {
  singlePrice: number;
  twinPricePerShare: number;
  downpaymentPerShare: number;
}

export interface BookingQuote {
  shares: number;
  pricePerShare: number;
  totalPrice: number;
  downpayment: number;
  monthlyInstallment: number;
  savings: number;
  usesComboRate: boolean;
  singlePricePerShare: number;
  comboPricePerShare: number;
}

export interface ResolvedSharePricing {
  shareNumber: number;
  unitPrice: number;
  downpaymentPortion: number;
  monthlyInstallment: number;
  pricingSource: PricingSource;
  phaseId: number;
}

export function calculateBookingQuote(
  shares: number,
  pricing: PhasePricing,
  withDownpayment: boolean,
  installmentMonths: number,
  useComboOffer = false,
): BookingQuote {
  const count = Math.max(1, Math.floor(shares));
  const usesComboRate = useComboOffer && count >= 2;
  const pricePerShare = usesComboRate ? pricing.twinPricePerShare : pricing.singlePrice;
  const totalPrice = pricePerShare * count;
  const downpayment = withDownpayment ? pricing.downpaymentPerShare * count : 0;
  const monthlyInstallment =
    installmentMonths > 0 ? Math.round((totalPrice - downpayment) / installmentMonths) : 0;
  const savings = usesComboRate ? (pricing.singlePrice - pricing.twinPricePerShare) * count : 0;

  return {
    shares: count,
    pricePerShare,
    totalPrice,
    downpayment,
    monthlyInstallment,
    savings,
    usesComboRate,
    singlePricePerShare: pricing.singlePrice,
    comboPricePerShare: pricing.twinPricePerShare,
  };
}

export function phaseToPricing(phase: PricingPhase): PhasePricing {
  return {
    singlePrice: phase.singlePrice,
    twinPricePerShare: phase.twinComboPrice,
    downpaymentPerShare: phase.downpayment,
  };
}

export function resolveSharePricing(
  shareNumber: number,
  shareNumbers: number[],
  phases: PricingPhase[],
  installmentMonths: number,
  pricingMode: PricingMode = PricingMode.STANDARD,
  custom?: {
    customTotalPrice?: number | null;
    customDownpayment?: number | null;
    customMonthlyAmount?: number | null;
  },
  useComboOffer = false,
): ResolvedSharePricing {
  const phase = getPhaseForShare(shareNumber, phases);
  if (!phase) {
    throw new Error("NO_PRICING_PHASES");
  }
  const usesCombo = useComboOffer && shareNumbers.length >= 2;

  if (pricingMode === PricingMode.CUSTOM && custom?.customTotalPrice) {
    const perShare = custom.customTotalPrice / shareNumbers.length;
    const dp = (custom.customDownpayment ?? 0) / shareNumbers.length;
    const monthly =
      custom.customMonthlyAmount != null
        ? custom.customMonthlyAmount / shareNumbers.length
        : installmentMonths > 0
          ? Math.round((perShare - dp) / installmentMonths)
          : 0;
    return {
      shareNumber,
      unitPrice: perShare,
      downpaymentPortion: dp,
      monthlyInstallment: monthly,
      pricingSource: PricingSource.CUSTOM_OVERRIDE,
      phaseId: phase.id,
    };
  }

  const pricing = phaseToPricing(phase);
  const unitPrice = usesCombo ? pricing.twinPricePerShare : pricing.singlePrice;
  const dpPerShare = pricing.downpaymentPerShare;
  const monthlyPerShare =
    installmentMonths > 0 ? Math.round((unitPrice - dpPerShare) / installmentMonths) : 0;

  return {
    shareNumber,
    unitPrice,
    downpaymentPortion: dpPerShare,
    monthlyInstallment: monthlyPerShare,
    pricingSource: usesCombo ? PricingSource.TWIN_COMBO : PricingSource.PHASE_DEFAULT,
    phaseId: phase.id,
  };
}

export function aggregateContractTotals(allocations: ResolvedSharePricing[]) {
  const totalPrice = allocations.reduce((s, a) => s + a.unitPrice, 0);
  const downpayment = allocations.reduce((s, a) => s + a.downpaymentPortion, 0);
  const monthlyTotal = allocations.reduce((s, a) => s + a.monthlyInstallment, 0);
  return { totalPrice, downpayment, monthlyTotal };
}

export function applyContractTermOverrides(
  resolved: ResolvedSharePricing[],
  totals: { totalPrice: number; downpayment: number; monthlyTotal: number },
  opts: {
    downpaymentTotal?: number;
    monthlyTotal?: number;
    installmentMonths: number;
  },
) {
  const downpayment = opts.downpaymentTotal ?? totals.downpayment;
  let monthlyTotal = opts.monthlyTotal ?? totals.monthlyTotal;

  if (opts.downpaymentTotal != null && opts.monthlyTotal == null && opts.installmentMonths > 0) {
    monthlyTotal = Math.round((totals.totalPrice - downpayment) / opts.installmentMonths);
  }

  const shareCount = resolved.length;
  if (shareCount > 0 && totals.totalPrice > 0) {
    for (const row of resolved) {
      row.downpaymentPortion = (row.unitPrice / totals.totalPrice) * downpayment;
      row.monthlyInstallment = Math.round(monthlyTotal / shareCount);
    }
  }

  return { totalPrice: totals.totalPrice, downpayment, monthlyTotal };
}
