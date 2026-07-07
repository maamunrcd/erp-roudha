import { getPortalSession, PORTAL_COOKIE } from "@/lib/portal-auth";
import { getPortalOverview } from "@/lib/services/portal.service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  const data = await getPortalOverview(session.profileId, customerId);
  if (!data) {
    const res = NextResponse.json({ error: "Session expired" }, { status: 401 });
    res.cookies.set(PORTAL_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  if (customerId && !data.enrollment) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
