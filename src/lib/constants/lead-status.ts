export const LEAD_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "SITE_VISIT", label: "Site visit" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
] as const;

export const LEAD_SOURCE_OPTIONS = [
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PHONE", label: "Phone" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "REFERRAL", label: "Referral" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "OTHER", label: "Other" },
] as const;

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function leadStatusClass(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-blue-900/30 text-blue-300";
    case "CONTACTED":
      return "bg-emerald/20 text-emerald";
    case "SITE_VISIT":
      return "bg-gold/20 text-gold";
    case "NEGOTIATING":
      return "bg-purple-900/30 text-purple-300";
    case "CONVERTED":
      return "bg-emerald/30 text-emerald-light";
    case "LOST":
      return "bg-red-900/30 text-red-400";
    default:
      return "bg-surface-alt text-muted-text";
  }
}

export function leadSourceLabel(source: string): string {
  return LEAD_SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
}
