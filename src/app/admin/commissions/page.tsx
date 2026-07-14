import { CommissionPanel } from "@/features/sales/components/CommissionPanel";

export default function CommissionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Commissions</h1>
        <p className="mt-1 text-sm text-muted-text">
          Auto commissions from enrollments plus manual entries — approve and mark paid.
        </p>
      </div>
      <CommissionPanel />
    </div>
  );
}
