import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteCustomerEnrollment, getCustomerDetail, updateCustomer } from "@/lib/services/customer.service";
import { customerUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const customer = await getCustomerDetail(id);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = customerUpdateSchema.parse(await req.json());
    const customer = await updateCustomer(id, body, session.user.id);
    return NextResponse.json(customer);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteCustomerEnrollment(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
