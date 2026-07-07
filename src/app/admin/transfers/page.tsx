"use client";

import { ShareTransferPanel } from "@/features/transfers/components/ShareTransferPanel";

export default function TransfersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Share Transfers</h1>
      <ShareTransferPanel />
    </div>
  );
}
