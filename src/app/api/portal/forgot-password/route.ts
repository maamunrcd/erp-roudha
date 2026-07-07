import { createForgotPasswordToken } from "@/lib/services/portal.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  login: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const tokenData = await createForgotPasswordToken(body.login);

    const response: { ok: true; message: string; resetToken?: string } = {
      ok: true,
      message: "If this account exists, reset instructions have been created.",
    };

    // Until an email/SMS provider is configured, expose reset token in dev for manual use.
    if (tokenData && process.env.NODE_ENV !== "production") {
      response.resetToken = tokenData.rawToken;
    }

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
