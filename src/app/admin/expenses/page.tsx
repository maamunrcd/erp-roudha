import { ExpensePanel } from "@/features/expenses/components/ExpensePanel";

export default function ExpensesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Company Expenses</h1>
        <p className="mt-1 text-sm text-muted-text">
          Track overhead and project development costs — separate from customer payments.
        </p>
      </div>
      <ExpensePanel />
    </div>
  );
}
