"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EnrollCustomerForm } from "@/features/customers/components/EnrollCustomerForm";

export default function EnrollCustomerPage() {
  const { id } = useParams<{ id: string }>();
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

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Add customer</h1>
      <p className="mb-6 text-sm text-muted-text">{projectName}</p>
      <EnrollCustomerForm
        projectId={id}
        projectPrefix={projectPrefix}
        availableShareCount={availableShareCount}
        pricingConfigured={pricingConfigured}
      />
    </div>
  );
}
