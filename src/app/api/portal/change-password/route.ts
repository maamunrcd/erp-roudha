import { getPortalSession, createPortalToken, PORTAL_COOKIE } from "@/lib/portal-auth";
import { markPortalPasswordChanged, verifyProfilePassword } from "@/lib/services/portal.service";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z
  .object({
    currentPassword: z.string().min(4),
    newPassword: z.string().min(8),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

export async function POST(req: Request) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const profile = await prisma.customerProfile.findUnique({
      where: { id: session.profileId },
      select: { id: true, fullName: true, phone: true, email: true, passwordHash: true },
    });
    if (!profile?.passwordHash) {
      return NextResponse.json({ error: "Invalid account state" }, { status: 400 });
    }

    const valid = await verifyProfilePassword(body.currentPassword, profile.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    const updated = await markPortalPasswordChanged(profile.id, body.newPassword);
    const token = await createPortalToken({
      profileId: updated.id,
      fullName: updated.fullName,
      phone: updated.phone,
      email: updated.email,
      mustChangePassword: updated.mustChangePassword,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(PORTAL_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
