import { SignJWT, jwtVerify } from "jose";

export const PORTAL_COOKIE = "portal_session";

export interface PortalSession {
  profileId: string;
  fullName: string;
  phone: string;
  email: string | null;
  mustChangePassword: boolean;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createPortalToken(session: PortalSession): Promise<string> {
  return new SignJWT({
    profileId: session.profileId,
    fullName: session.fullName,
    phone: session.phone,
    email: session.email,
    mustChangePassword: session.mustChangePassword,
    type: "portal",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyPortalToken(token: string): Promise<PortalSession> {
  const { payload } = await jwtVerify(token, getSecret());
  if (payload.type !== "portal" || !payload.profileId) {
    throw new Error("Invalid portal token");
  }
  return {
    profileId: String(payload.profileId),
    fullName: String(payload.fullName ?? ""),
    phone: String(payload.phone ?? ""),
    email: payload.email ? String(payload.email) : null,
    mustChangePassword: Boolean(payload.mustChangePassword),
  };
}
