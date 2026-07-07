import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createVendorCompany, listVendorCompanies } from "@/lib/services/vendor.service";
import { vendorSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const vendors = await listVendorCompanies();
    return NextResponse.json(vendors);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = vendorSchema.parse(await req.json());
    const vendor = await createVendorCompany(body);
    return NextResponse.json(vendor, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
