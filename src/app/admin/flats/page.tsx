import { FlatInventoryPanel } from "@/features/lifecycle/components/FlatInventoryPanel";

export default function FlatsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Flats</h1>
        <p className="mt-1 text-sm text-muted-text">
          Flat inventory and allocation to share customers after developer construction.
        </p>
      </div>
      <FlatInventoryPanel />
    </div>
  );
}
