import { auth } from "@/lib/auth";
import { verifyPortalToken, PORTAL_COOKIE } from "@/lib/portal-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminPublicPaths = ["/login", "/api/auth"];
const portalPublicPaths = [
  "/portal/login",
  "/portal/forgot-password",
  "/portal/reset-password",
  "/api/portal/auth",
  "/api/portal/forgot-password",
  "/api/portal/reset-password",
];

export default auth(async (req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isPortalRoute = pathname.startsWith("/portal") || pathname.startsWith("/api/portal");
  const isAdminApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/portal");

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // Customer portal auth (separate from admin NextAuth)
  if (isPortalRoute) {
    const isPortalPublic = portalPublicPaths.some((p) => pathname.startsWith(p));
    const portalToken = req.cookies.get(PORTAL_COOKIE)?.value;

    if (pathname === "/portal/login" && portalToken) {
      try {
        const session = await verifyPortalToken(portalToken);
        return NextResponse.redirect(
          new URL(session.mustChangePassword ? "/portal/change-password" : "/portal", req.url),
        );
      } catch {
        // invalid token — show login
      }
    }

    if (!isPortalPublic) {
      if (!portalToken) {
        if (pathname.startsWith("/api/portal")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.redirect(new URL("/portal/login", req.url));
      }
      try {
        const session = await verifyPortalToken(portalToken);
        const onChangePasswordPage = pathname === "/portal/change-password";
        const onChangePasswordApi = pathname === "/api/portal/change-password";
        if (session.mustChangePassword && !onChangePasswordPage && !onChangePasswordApi) {
          if (pathname.startsWith("/api/portal")) {
            return NextResponse.json({ error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" }, { status: 403 });
          }
          return NextResponse.redirect(new URL("/portal/change-password", req.url));
        }
      } catch {
        if (pathname.startsWith("/api/portal")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.redirect(new URL("/portal/login", req.url));
      }
    }

    return NextResponse.next();
  }

  // Admin auth
  const isAdminPublic = adminPublicPaths.some((p) => pathname.startsWith(p));
  const session = (req as { auth?: { user?: unknown } }).auth;

  if (!session?.user && !isAdminPublic && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!session?.user && isAdminApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname === "/login" && session?.user) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const role = (session as { user?: { role?: string } })?.user?.role;
  if (role === "AUDITOR" && isAdminApi && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    return NextResponse.json({ error: "Auditors have read-only access" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|storage).*)"],
};
