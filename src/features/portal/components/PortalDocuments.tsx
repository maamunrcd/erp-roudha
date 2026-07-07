"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Download, FileText } from "lucide-react";

interface PortalDocument {
  id: string;
  label: string | null;
  project: { prefix: string; name: string } | null;
  createdAt: string;
}

export function PortalDocuments({ customerId }: { customerId?: string }) {
  const [docs, setDocs] = useState<PortalDocument[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    fetch(`/api/portal/documents?${params}`)
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [customerId]);

  if (docs.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-lg font-medium">Project documents</h3>
      <div className="space-y-2">
        {docs.map((doc) => (
          <Card key={doc.id} className="flex items-center justify-between py-3">
            <div className="flex items-start gap-2">
              <FileText size={16} className="mt-0.5 text-emerald" />
              <div>
                <p className="font-medium">{doc.label}</p>
                <p className="text-xs text-muted-text">
                  {doc.project?.prefix} — {doc.project?.name} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <a
              href={`/api/portal/documents?id=${doc.id}`}
              download
              className="inline-flex items-center gap-1 rounded-lg border border-emerald/30 px-3 py-1.5 text-xs text-emerald hover:bg-emerald/10"
            >
              <Download size={14} /> Download
            </a>
          </Card>
        ))}
      </div>
    </section>
  );
}
