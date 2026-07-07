"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import type { PricingPhase } from "@/lib/constants/projects";

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => setInitial(data.project));
  }, [id]);

  if (!initial) {
    return (
      <div>
        <div className="mb-6 h-8 w-40 animate-pulse rounded-md bg-surface-alt" />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit project</h1>
      <ProjectForm
        mode="edit"
        projectId={id}
        initial={{
          prefix: initial.prefix as string,
          name: initial.name as string,
          nameBn: initial.nameBn as string | undefined,
          status: initial.status as string,
          installmentMonths: initial.installmentMonths as number,
          totalShares: initial.totalShares as number,
          publicShares: initial.publicShares as number,
          pricingPhases: (initial.pricingPhases as PricingPhase[] | undefined) ?? [],
          vendorCompanyId: initial.vendorCompanyId as string | undefined,
          landBuyPrice: initial.landBuyPrice as number | undefined,
          targetSellPrice: initial.targetSellPrice as number | undefined,
          companyPaidAmount: initial.companyPaidAmount as number | undefined,
          dealStartDate: initial.dealStartDate as string | undefined,
          dealEndDate: initial.dealEndDate as string | undefined,
          acquisitionNotes: initial.acquisitionNotes as string | undefined,
        }}
      />
    </div>
  );
}
