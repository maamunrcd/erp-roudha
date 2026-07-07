"use client";

import { useEffect, useState } from "react";
import { EnrollCustomerForm } from "@/features/customers/components/EnrollCustomerForm";
import { Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ProjectOption {
  id: string;
  prefix: string;
  name: string;
  totalShares: number;
}

export function CustomerCreatePage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [availableShareCount, setAvailableShareCount] = useState(0);
  const [pricingConfigured, setPricingConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((list: ProjectOption[]) => {
        setProjects(list);
        if (list.length) setProjectId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setAvailableShareCount(d.availableShareCount ?? 0);
        setPricingConfigured(d.pricingConfigured ?? true);
      });
  }, [projectId]);

  const selected = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <div>
          <Label htmlFor="project">Project</Label>
          <Select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.prefix} — {p.name}
              </option>
            ))}
          </Select>
          {selected && selected.totalShares === 0 && (
            <p className="mt-2 text-sm text-gold">This project has no shares configured yet. Add shares in project settings first.</p>
          )}
        </div>
      </Card>

      {projectId && (
        <EnrollCustomerForm
          projectId={projectId}
          projectPrefix={selected?.prefix}
          availableShareCount={availableShareCount}
          pricingConfigured={pricingConfigured}
          redirectTo="/admin/customers"
        />
      )}
    </div>
  );
}
