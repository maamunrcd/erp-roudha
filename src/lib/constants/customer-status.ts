export const CUSTOMER_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", editable: true },
  { value: "COMPLETED", label: "Completed", editable: true },
  { value: "CANCELLED", label: "Cancelled", editable: true },
  { value: "PAUSED", label: "Paused", editable: true },
  { value: "SHARE_TO_SELL", label: "Share To Sell", editable: true },
  { value: "TRANSFERRED", label: "Transferred", editable: false },
] as const;

/** Editable statuses — used for Status and Filter status dropdowns */
export const CUSTOMER_STATUSES = CUSTOMER_STATUS_OPTIONS.filter((s) => s.editable);

export type CustomerStatusValue = (typeof CUSTOMER_STATUS_OPTIONS)[number]["value"];

export function customerStatusLabel(status: string): string {
  return CUSTOMER_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status.replace(/_/g, " ");
}

export function customerStatusClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald/20 text-emerald";
    case "COMPLETED":
      return "bg-blue-900/30 text-blue-300";
    case "CANCELLED":
      return "bg-red-900/30 text-red-400";
    case "PAUSED":
      return "bg-gold/20 text-gold";
    case "SHARE_TO_SELL":
      return "bg-purple-900/30 text-purple-300";
    case "TRANSFERRED":
      return "bg-surface-alt text-muted-text";
    default:
      return "bg-surface-alt text-muted-text";
  }
}
