import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { renderSimpleReceiptPdf, type ReceiptPdfData } from "@/lib/pdf/simple-pdf";

export type { ReceiptPdfData };

export async function writeReceiptPdf(data: ReceiptPdfData): Promise<string> {
  const dir = path.join(process.cwd(), "storage", "receipts");
  await mkdir(dir, { recursive: true });
  const filename = `receipt-${data.slNo}.pdf`;
  const filePath = path.join(dir, filename);
  const buffer = await renderSimpleReceiptPdf(data);
  await writeFile(filePath, buffer);
  return `/storage/receipts/${filename}`;
}

export function receiptFileHash(signatureAnchor: string): string {
  return createHash("sha256").update(signatureAnchor).digest("hex").slice(0, 32);
}

export function receiptContentType(fileUrl: string): string {
  return fileUrl.endsWith(".pdf") ? "application/pdf" : "text/plain; charset=utf-8";
}
