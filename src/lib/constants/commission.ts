export const COMMISSION_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const COMMISSION_BASIS_OPTIONS = [
  { value: "DOWNPAYMENT", label: "Downpayment" },
  { value: "ENROLLMENT", label: "Full contract" },
  { value: "PAYMENT", label: "Payment" },
  { value: "MANUAL", label: "Manual" },
] as const;

export function commissionStatusLabel(status: string): string {
  return COMMISSION_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function commissionStatusClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-gold/20 text-gold";
    case "APPROVED":
      return "bg-blue-900/30 text-blue-300";
    case "PAID":
      return "bg-emerald/20 text-emerald";
    case "CANCELLED":
      return "bg-red-900/30 text-red-400";
    default:
      return "bg-surface-alt text-muted-text";
  }
}

export function commissionBasisLabel(basis: string): string {
  return COMMISSION_BASIS_OPTIONS.find((b) => b.value === basis)?.label ?? basis;
}
