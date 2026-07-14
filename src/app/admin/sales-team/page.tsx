import { SalesTeamPanel } from "@/features/sales/components/SalesTeamPanel";

export default function SalesTeamPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Sales Team</h1>
        <p className="mt-1 text-sm text-muted-text">
          Manage agents and their default commission rates for share enrollments.
        </p>
      </div>
      <SalesTeamPanel />
    </div>
  );
}
