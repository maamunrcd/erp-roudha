import { getPortalSession } from "@/lib/portal-auth";
import { updatePortalProfile } from "@/lib/services/portal.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await req.json());
    const profile = await updatePortalProfile(session.profileId, body);
    return NextResponse.json({
      ok: true,
      profile: {
        fullName: profile.fullName,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update profile";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
