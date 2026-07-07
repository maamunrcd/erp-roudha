export function effectiveInstallmentMonths(
  contract: { customInstallmentMonths?: number | null } | null | undefined,
  projectInstallmentMonths: number,
): number {
  return contract?.customInstallmentMonths ?? projectInstallmentMonths;
}
