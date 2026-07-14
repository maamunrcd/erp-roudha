import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createReminder, getReminderInbox, listReminders } from "@/lib/services/reminder.service";
import { reminderSchema } from "@/lib/validators/schemas";
import { ReminderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("inbox") === "1") {
      return NextResponse.json(await getReminderInbox());
    }
    const status = searchParams.get("status") as ReminderStatus | null;
    const overdueOnly = searchParams.get("overdue") === "1";
    const reminders = await listReminders({
      ...(status ? { status } : {}),
      overdueOnly,
    });
    return NextResponse.json(reminders);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = reminderSchema.parse(await req.json());
    const reminder = await createReminder({
      ...body,
      createdByUserId: session.user.id!,
    });
    return NextResponse.json(reminder, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
