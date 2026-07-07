"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/i18n/format";
import { Button } from "@/components/ui/Button";
import { customerStatusClass, customerStatusLabel } from "@/lib/constants/customer-status";

export interface ProjectCustomerRow {
  id: string;
  trackingId: string;
  fullName: string;
  phone: string;
  status: string;
  shareCount: number;
  pricingMode: string;
  downpaymentStatus: string;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  overdueAmount: number;
  otherProjects: number;
}

interface ProjectCustomerTableProps {
  customers: ProjectCustomerRow[];
  projectPrefix: string;
}

export function ProjectCustomerTable({ customers, projectPrefix }: ProjectCustomerTableProps) {
  if (!customers.length) {
    return <p className="text-sm text-muted-text">No customers enrolled in this project yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
          <tr>
            <th className="px-4 py-3">Tracking ID</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Shares</th>
            <th className="px-4 py-3">Total due</th>
            <th className="px-4 py-3">Paid</th>
            <th className="px-4 py-3">Remaining</th>
            <th className="px-4 py-3">Overdue</th>
            <th className="px-4 py-3">Downpayment</th>
            <th className="px-4 py-3">Other projects</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t border-card-border hover:bg-surface-alt/50">
              <td className="px-4 py-3 font-mono text-emerald-light">{c.trackingId}</td>
              <td className="px-4 py-3">
                <p>{c.fullName}</p>
                <p className="text-xs text-muted-text">{c.phone}</p>
              </td>
              <td className="px-4 py-3">{c.shareCount} share{c.shareCount !== 1 ? "s" : ""}</td>
              <td className="px-4 py-3">{formatCurrency(c.totalDue, "en")}</td>
              <td className="px-4 py-3 text-emerald">{formatCurrency(c.totalPaid, "en")}</td>
              <td className="px-4 py-3 text-gold">{formatCurrency(c.remaining, "en")}</td>
              <td className="px-4 py-3">
                {c.overdueAmount > 0 ? (
                  <span className="text-red-400">{formatCurrency(c.overdueAmount, "en")}</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded px-2 py-0.5 text-xs ${c.downpaymentStatus === "PAID" ? "bg-emerald/20 text-emerald" : "bg-gold/20 text-gold"}`}>
                  {c.downpaymentStatus}
                </span>
              </td>
              <td className="px-4 py-3">
                {c.otherProjects > 0 ? (
                  <span className="text-xs text-muted-text">{c.otherProjects} more</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/customers?prefix=${projectPrefix}&search=${c.trackingId}`}>
                  <Button size="sm" variant="ghost">View</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
