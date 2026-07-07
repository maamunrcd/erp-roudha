import { createHmac } from "crypto";

export function hmacAnchor(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function sha256(content: string): string {
  return createHmac("sha256", "file-hash").update(content).digest("hex");
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function decimal(n: number): number {
  return Math.round(n * 100) / 100;
}
