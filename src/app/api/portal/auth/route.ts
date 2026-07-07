import { createPortalToken, PORTAL_COOKIE } from "@/lib/portal-auth";
import { findProfileByLogin, verifyProfilePassword } from "@/lib/services/portal.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(4),
});

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const profile = await findProfileByLogin(body.login);

    if (!profile?.passwordHash) {
      return NextResponse.json({ error: "Invalid phone/email or password" }, { status: 401 });
    }

    const valid = await verifyProfilePassword(body.password, profile.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid phone/email or password" }, { status: 401 });
    }

    const token = await createPortalToken({
      profileId: profile.id,
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      mustChangePassword: profile.mustChangePassword,
    });

    const res = NextResponse.json({
      ok: true,
      profile: {
        fullName: profile.fullName,
        phone: profile.phone,
        email: profile.email,
        mustChangePassword: profile.mustChangePassword,
      },
    });

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
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
