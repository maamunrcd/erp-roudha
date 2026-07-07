import type { ShareAllocationStatus } from "@prisma/client";

export const SHARE_STATUS_LABELS: Record<
  ShareAllocationStatus,
  { en: string; short: string }
> = {
  AVAILABLE: { en: "Available", short: "Free" },
  RESERVED: { en: "On hold", short: "Hold" },
  ALLOCATED: { en: "Booked", short: "Booked" },
  TRANSFERRED: { en: "Transferred", short: "Xfer" },
};

export const SHARE_STATUS_STYLES: Record<ShareAllocationStatus, string> = {
  AVAILABLE: "border-emerald/40 bg-emerald/10 text-emerald",
  RESERVED: "border-gold/40 bg-gold/10 text-gold",
  ALLOCATED: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  TRANSFERRED: "border-purple-400/40 bg-purple-400/10 text-purple-300",
};

export interface ShareGridItem {
  id: string;
  shareNumber: number;
  allocationStatus: ShareAllocationStatus;
  holderTrackingId?: string | null;
  holderName?: string | null;
}

interface ShareInventoryGridProps {
  shares: ShareGridItem[];
}

export function ShareInventoryGrid({ shares }: ShareInventoryGridProps) {
  const counts = shares.reduce(
    (acc, s) => {
      acc[s.allocationStatus] = (acc[s.allocationStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.keys(SHARE_STATUS_LABELS) as ShareAllocationStatus[]).map((status) => (
          <span key={status} className={`rounded-full border px-2 py-0.5 ${SHARE_STATUS_STYLES[status]}`}>
            {SHARE_STATUS_LABELS[status].en}: {counts[status] ?? 0}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {shares.map((share) => (
          <div
            key={share.id}
            title={
              share.holderTrackingId
                ? `#${share.shareNumber} — ${share.holderTrackingId} (${share.holderName})`
                : `#${share.shareNumber} — ${SHARE_STATUS_LABELS[share.allocationStatus].en}`
            }
            className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-center text-[10px] leading-tight ${SHARE_STATUS_STYLES[share.allocationStatus]}`}
          >
            <span className="font-semibold">{share.shareNumber}</span>
            <span className="mt-0.5 opacity-80">{SHARE_STATUS_LABELS[share.allocationStatus].short}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
