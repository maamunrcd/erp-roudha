import { LandValuationPanel } from "@/features/lifecycle/components/LandValuationPanel";

export default function LandValuePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Land value</h1>
        <p className="mt-1 text-sm text-muted-text">
          Track land valuation over time after purchase — growth vs buy price and target sell.
        </p>
      </div>
      <LandValuationPanel />
    </div>
  );
}
