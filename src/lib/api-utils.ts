import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("Unauthorized", 401);
  }
  return session;
}

export function requireRole(role: Role | undefined, allowed: Role[]) {
  if (!role || !allowed.includes(role)) {
    throw new ApiError("Forbidden", 403);
  }
}

export function requireWriteRole(role: Role | undefined) {
  if (role === Role.AUDITOR) {
    throw new ApiError("Auditors have read-only access", 403);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function formatZodError(error: ZodError): string {
  const first = error.errors[0];
  if (!first) return "Validation failed";
  const path = first.path.length ? first.path.join(".") : "body";
  return `${path}: ${first.message}`;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: formatZodError(error), details: error.flatten() },
      { status: 400 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2028") {
      return NextResponse.json(
        { error: "Database operation timed out. Please try again." },
        { status: 503 },
      );
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
