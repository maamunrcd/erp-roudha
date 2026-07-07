export type Locale = "bn" | "en";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

export function toLocalizedDigits(text: string, locale: Locale): string {
  if (locale === "en") return text;
  return text.replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)] ?? digit);
}

export function formatNumber(value: number, locale: Locale): string {
  const grouped = value.toLocaleString("en-IN");
  return toLocalizedDigits(grouped, locale);
}

export function formatCurrency(amount: number, locale: Locale): string {
  return `৳${formatNumber(amount, locale)}/-`;
}

export function formatIndex(index: number, locale: Locale, pad = 2): string {
  return toLocalizedDigits(String(index).padStart(pad, "0"), locale);
}
