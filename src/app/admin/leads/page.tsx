import { LeadPanel } from "@/features/leads/components/LeadPanel";

export default function LeadsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="mt-1 text-sm text-muted-text">
          Track inquiries, site visits, and convert warm leads into share enrollments.
        </p>
      </div>
      <LeadPanel />
    </div>
  );
}
