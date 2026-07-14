export const REMINDER_TYPE_OPTIONS = [
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "SITE_VISIT", label: "Site visit" },
  { value: "INSTALLMENT_DUE", label: "Installment due" },
  { value: "DOCUMENT", label: "Document" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export function reminderTypeLabel(type: string): string {
  return REMINDER_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}
