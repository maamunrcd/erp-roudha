import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPortalToken, PORTAL_COOKIE } from "@/lib/portal-auth-edge";

const adminPublicPaths = ["/login", "/api/auth"];
const portalPublicPaths = [
  "/portal/login",
  "/portal/forgot-password",
  "/portal/reset-password",
  "/api/portal/auth",
  "/api/portal/forgot-password",
  "/api/portal/reset-password",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPortalRoute = pathname.startsWith("/portal") || pathname.startsWith("/api/portal");
  const isAdminApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/portal");

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

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
            return NextResponse.json(
              { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
              { status: 403 },
            );
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

  const isAdminPublic = adminPublicPaths.some((p) => pathname.startsWith(p));
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  const role = typeof token?.role === "string" ? token.role : undefined;

  if (!token && !isAdminPublic && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!token && isAdminApi && !isAdminPublic) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (role === "AUDITOR" && isAdminApi && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    return NextResponse.json({ error: "Auditors have read-only access" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|storage).*)"],
};
