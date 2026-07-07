export interface PricingPhase {
  id: number;
  label: string;
  shares: string;
  shareFrom: number;
  shareTo: number;
  singlePrice: number;
  twinComboPrice: number;
  downpayment: number;
  monthly: number;
}

export const GVR_PRICING_PHASES: PricingPhase[] = [
  {
    id: 1,
    label: "Phase 1",
    shares: "Shares 1–20",
    shareFrom: 1,
    shareTo: 20,
    singlePrice: 499999,
    twinComboPrice: 450000,
    downpayment: 150000,
    monthly: 7291,
  },
  {
    id: 2,
    label: "Phase 2",
    shares: "Shares 21–40",
    shareFrom: 21,
    shareTo: 40,
    singlePrice: 524999,
    twinComboPrice: 475000,
    downpayment: 150000,
    monthly: 7812,
  },
  {
    id: 3,
    label: "Phase 3",
    shares: "Shares 41–60",
    shareFrom: 41,
    shareTo: 60,
    singlePrice: 549999,
    twinComboPrice: 500000,
    downpayment: 150000,
    monthly: 8333,
  },
  {
    id: 4,
    label: "Phase 4",
    shares: "Shares 61–72",
    shareFrom: 61,
    shareTo: 72,
    singlePrice: 574999,
    twinComboPrice: 525000,
    downpayment: 150000,
    monthly: 8854,
  },
];

export function getPhaseForShare(shareNumber: number, phases: PricingPhase[]): PricingPhase | undefined {
  if (!phases.length) return undefined;
  const phase = phases.find((p) => shareNumber >= p.shareFrom && shareNumber <= p.shareTo);
  return phase ?? phases[phases.length - 1];
}

export const SEED_PROJECTS = [
  {
    prefix: "GVR",
    name: "Raudha Green Valley",
    nameBn: "রাওদা গ্রিন ভ্যালি",
    status: "ACTIVE" as const,
    installmentMonths: 48,
    totalShares: 72,
    publicShares: 60,
    dimensions: {
      landKatha: 12,
      flatSqFt: 1156,
      building: "B+G+12",
      parkingSlots: 36,
    },
    layouts: {
      block: "Block-G",
      plots: "29-32",
      location: "Dhaka Modern City",
    },
    pricingPhases: GVR_PRICING_PHASES,
  },
  {
    prefix: "DMC5K",
    name: "Twin Tower — 5 Katha",
    nameBn: "৫ কাঠা টুইন টাওয়ার",
    status: "ACTIVE" as const,
    installmentMonths: 48,
    totalShares: 24,
    publicShares: 24,
    dimensions: { landKatha: 5 },
    layouts: { location: "Dhaka Modern City" },
    pricingPhases: [
      {
        id: 1,
        label: "Phase 1",
        shares: "Shares 1–24",
        shareFrom: 1,
        shareTo: 24,
        singlePrice: 750000,
        twinComboPrice: 700000,
        downpayment: 200000,
        monthly: 11458,
      },
    ],
  },
  {
    prefix: "DMC3K",
    name: "Premium Tower — 3 Katha",
    nameBn: "৩ কাঠা প্রিমিয়াম টাওয়ার",
    status: "PLANNING" as const,
    installmentMonths: 36,
    totalShares: 0,
    publicShares: 0,
    dimensions: { landKatha: 3 },
    layouts: { location: "Dhaka Modern City" },
    pricingPhases: [],
  },
];
