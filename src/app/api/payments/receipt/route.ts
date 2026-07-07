import { handleApiError, requireSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { receiptContentType } from "@/lib/receipts/write-receipt-file";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const slNo = searchParams.get("slNo");
    if (!slNo) return NextResponse.json({ error: "slNo required" }, { status: 400 });

    const receipt = await prisma.moneyReceipt.findFirst({
      where: { receiptSlNo: Number(slNo) },
      include: { customer: { select: { trackingId: true, fullName: true } } },
    });
    if (!receipt?.pdfUrl) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const filePath = path.join(process.cwd(), receipt.pdfUrl.replace(/^\//, ""));
    const content = await readFile(filePath);
    const ext = receipt.pdfUrl.endsWith(".pdf") ? "pdf" : "txt";
    return new NextResponse(content, {
      headers: {
        "Content-Type": receiptContentType(receipt.pdfUrl),
        "Content-Disposition": `attachment; filename="receipt-${slNo}.${ext}"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
