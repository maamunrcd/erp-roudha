"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Users, ArrowLeftRight, FolderKanban, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/expenses", label: "Expenses", icon: Receipt },
] as const;

function getActiveHref(pathname: string): string | null {
  const match = links
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

export function Sidebar() {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);
  const { data: session } = useSession();

  return (
    <aside className="flex w-60 flex-col border-r border-card-border bg-surface p-4">
      <div className="mb-8">
        <p className="text-lg font-semibold text-emerald">Raudha ERP</p>
        <p className="text-xs text-muted-text font-bengali">রাওদা প্রোপার্টিজ</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              activeHref === href ? "bg-emerald/15 text-emerald" : "text-muted-text hover:bg-surface-alt hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-card-border pt-4">
        <p className="text-xs text-muted-text">{session?.user?.name}</p>
        <p className="text-xs text-gold">{session?.user?.role}</p>
        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
        <a href="/portal" className="mt-2 block text-center text-xs text-muted-text hover:text-emerald">
          Customer portal →
        </a>
      </div>
    </aside>
  );
}
