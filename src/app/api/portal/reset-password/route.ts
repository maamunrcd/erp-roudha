import { consumeForgotPasswordToken } from "@/lib/services/portal.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(12),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    await consumeForgotPasswordToken(body.token, body.newPassword);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Failed to reset password";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
