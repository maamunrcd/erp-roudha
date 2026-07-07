import { Scorecards } from "@/features/dashboard/components/Scorecards";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Master Dashboard</h1>
      <Scorecards />
    </div>
  );
}
