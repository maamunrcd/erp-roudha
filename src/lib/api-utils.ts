import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

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

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
