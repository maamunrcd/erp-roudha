"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { EnrollCustomerForm } from "@/features/customers/components/EnrollCustomerForm";
import { FormSkeleton } from "@/components/ui/Skeleton";

function EnrollCustomerContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [availableShareCount, setAvailableShareCount] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectPrefix, setProjectPrefix] = useState("");
  const [pricingConfigured, setPricingConfigured] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableShareCount(data.availableShareCount ?? 0);
        setProjectName(data.project?.name ?? "");
        setProjectPrefix(data.project?.prefix ?? "");
        setPricingConfigured(data.pricingConfigured ?? true);
      });
  }, [id]);

  const leadId = searchParams.get("leadId") ?? undefined;
  const initialFullName = searchParams.get("name") ?? "";
  const initialPhone = searchParams.get("phone") ?? "";
  const initialSalesAgentId = searchParams.get("agentId") ?? "";

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Add customer</h1>
      <p className="mb-6 text-sm text-muted-text">
        {projectName}
        {leadId ? " · Converting from lead" : ""}
      </p>
      <EnrollCustomerForm
        projectId={id}
        projectPrefix={projectPrefix}
        availableShareCount={availableShareCount}
        pricingConfigured={pricingConfigured}
        initialFullName={initialFullName}
        initialPhone={initialPhone}
        leadId={leadId}
        initialSalesAgentId={initialSalesAgentId}
      />
    </div>
  );
}

export default function EnrollCustomerPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={6} />}>
      <EnrollCustomerContent />
    </Suspense>
  );
}
