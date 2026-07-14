import { ReminderPanel } from "@/features/reminders/components/ReminderPanel";

export default function RemindersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reminders & Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-text">
          Manual reminders, overdue installments, and lead follow-ups in one inbox.
        </p>
      </div>
      <ReminderPanel />
    </div>
  );
}
