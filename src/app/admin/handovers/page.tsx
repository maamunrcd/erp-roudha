import { HandoverPanel } from "@/features/lifecycle/components/HandoverPanel";

export default function HandoversPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Handovers</h1>
        <p className="mt-1 text-sm text-muted-text">
          Keys, documents, and completion — marks customer registration as handover done.
        </p>
      </div>
      <HandoverPanel />
    </div>
  );
}
