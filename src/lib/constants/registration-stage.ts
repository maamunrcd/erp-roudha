export const REGISTRATION_STAGE_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "AGREEMENT_SIGNED", label: "Agreement signed" },
  { value: "DEED_PREPARATION", label: "Deed preparation" },
  { value: "MUTATION_PENDING", label: "Mutation pending" },
  { value: "MUTATION_DONE", label: "Mutation done" },
  { value: "REGISTRY_PENDING", label: "Registry pending" },
  { value: "REGISTRY_DONE", label: "Registry done" },
  { value: "HANDOVER_DONE", label: "Handover done" },
] as const;

export function registrationStageLabel(stage: string): string {
  return REGISTRATION_STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;
}

export function registrationStageClass(stage: string): string {
  switch (stage) {
    case "NOT_STARTED":
      return "bg-surface-alt text-muted-text";
    case "AGREEMENT_SIGNED":
    case "DEED_PREPARATION":
      return "bg-blue-900/30 text-blue-300";
    case "MUTATION_PENDING":
    case "REGISTRY_PENDING":
      return "bg-gold/20 text-gold";
    case "MUTATION_DONE":
    case "REGISTRY_DONE":
      return "bg-emerald/20 text-emerald";
    case "HANDOVER_DONE":
      return "bg-emerald/30 text-emerald-light";
    default:
      return "bg-surface-alt text-muted-text";
  }
}
