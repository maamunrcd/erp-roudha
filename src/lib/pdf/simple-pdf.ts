import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { PaymentMethod, PaymentPurpose } from "@prisma/client";
import { BRAND } from "@/lib/constants/brand";
import { PURPOSE_LABELS } from "@/features/payments/utils/purpose-labels";

const A5: [number, number] = [420, 595];
const A4: [number, number] = [595, 842];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_BANKING: "Mobile Banking",
};

export interface ReceiptPdfData {
  slNo: number;
  trackingId: string;
  customerName: string;
  purpose: PaymentPurpose;
  installmentIndex?: number | null;
  amount: number;
  paymentMethod: PaymentMethod;
  issuedAt: Date;
}

function drawLine(page: PDFPage, y: number, width = 380) {
  page.drawLine({
    start: { x: 40, y },
    end: { x: width, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
}

function drawRow(page: PDFPage, font: PDFFont, label: string, value: string, y: number) {
  page.drawText(label, { x: 40, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(value, { x: 180, y, size: 10, font });
}

function formatMoney(amount: number) {
  return `BDT ${amount.toLocaleString("en-IN")}/-`;
}

export async function renderSimpleReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A5);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const purposeLabel = PURPOSE_LABELS[data.purpose]?.en ?? data.purpose;
  const monthLine =
    data.purpose === "INSTALLMENT" && data.installmentIndex
      ? ` (Month ${data.installmentIndex})`
      : "";

  let y = 545;
  page.drawText(BRAND.nameEn, { x: 40, y, size: 14, font: bold });
  y -= 18;
  page.drawText("Money Receipt", { x: 40, y, size: 12, font: bold });
  y -= 24;
  drawLine(page, y);
  y -= 20;

  drawRow(page, regular, "Receipt No.", String(data.slNo), y);
  y -= 16;
  drawRow(page, regular, "Date", data.issuedAt.toLocaleDateString("en-GB"), y);
  y -= 16;
  drawRow(page, regular, "Customer ID", data.trackingId, y);
  y -= 16;
  drawRow(page, regular, "Name", data.customerName, y);
  y -= 16;
  drawRow(page, regular, "Purpose", `${purposeLabel}${monthLine}`, y);
  y -= 16;
  drawRow(page, regular, "Payment Method", METHOD_LABELS[data.paymentMethod], y);
  y -= 24;
  drawLine(page, y);
  y -= 28;

  page.drawText("Amount Received", { x: 40, y, size: 10, font: regular, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(formatMoney(data.amount), { x: 40, y: y - 22, size: 16, font: bold });

  page.drawText("Computer-generated receipt.", {
    x: 40,
    y: 30,
    size: 8,
    font: regular,
    color: rgb(0.55, 0.55, 0.55),
  });

  return Buffer.from(await pdf.save());
}

export async function wrapBufferAsSimplePdf(
  file: Buffer,
  mimeType: string,
  title: string,
): Promise<Buffer> {
  if (mimeType === "application/pdf" || file.subarray(0, 4).toString("utf8") === "%PDF") {
    return file;
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText(BRAND.nameEn, { x: 50, y: 800, size: 12, font: bold });
  page.drawText(title, { x: 50, y: 780, size: 11, font: regular });
  drawLine(page, 770, 545);

  if (mimeType === "image/png") {
    const image = await pdf.embedPng(file);
    const maxW = 495;
    const maxH = 700;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, { x: 50, y: 770 - h, width: w, height: h });
  } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const image = await pdf.embedJpg(file);
    const maxW = 495;
    const maxH = 700;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, { x: 50, y: 770 - h, width: w, height: h });
  } else {
    page.drawText("Attached file", { x: 50, y: 740, size: 10, font: regular });
    page.drawText(`Type: ${mimeType}`, { x: 50, y: 722, size: 9, font: regular, color: rgb(0.45, 0.45, 0.45) });
  }

  return Buffer.from(await pdf.save());
}
