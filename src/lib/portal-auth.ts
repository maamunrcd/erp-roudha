import { cookies } from "next/headers";
import {
  createPortalToken,
  verifyPortalToken,
  PORTAL_COOKIE,
  type PortalSession,
} from "@/lib/portal-auth-edge";

export { createPortalToken, verifyPortalToken, PORTAL_COOKIE, type PortalSession };

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyPortalToken(token);
  } catch {
    return null;
  }
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
