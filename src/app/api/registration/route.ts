import { handleApiError, requireSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { RegistrationStage } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") as RegistrationStage | null;
    const prefix = searchParams.get("prefix");

    const customers = await prisma.customer.findMany({
      where: {
        status: { notIn: ["CANCELLED", "TRANSFERRED"] },
        ...(stage ? { registrationStage: stage } : {}),
        ...(prefix ? { trackingId: { startsWith: prefix } } : {}),
      },
      select: {
        id: true,
        trackingId: true,
        fullName: true,
        phone: true,
        status: true,
        shareCount: true,
        registrationStage: true,
        registrationNotes: true,
        registrationUpdatedAt: true,
        project: { select: { prefix: true, name: true } },
      },
      orderBy: [{ registrationStage: "asc" }, { fullName: "asc" }],
    });

    return NextResponse.json(customers);
  } catch (e) {
    return handleApiError(e);
  }
}
