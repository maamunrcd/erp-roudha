import { DeveloperAgreementPanel } from "@/features/lifecycle/components/DeveloperAgreementPanel";

export default function DevelopersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Developers</h1>
        <p className="mt-1 text-sm text-muted-text">
          Developer agreements, revenue share, and construction timelines per project.
        </p>
      </div>
      <DeveloperAgreementPanel />
    </div>
  );
}
