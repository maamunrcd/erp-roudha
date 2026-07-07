import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account — Raudha Properties",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
