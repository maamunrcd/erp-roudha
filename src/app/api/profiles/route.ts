import { handleApiError, requireSession } from "@/lib/api-utils";
import { findProfileByPhone } from "@/lib/services/profile.service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const phone = new URL(req.url).searchParams.get("phone");
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
    const profile = await findProfileByPhone(phone);
    return NextResponse.json(profile);
  } catch (e) {
    return handleApiError(e);
  }
}
