import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";

export async function listVendorCompanies() {
  return prisma.vendorCompany.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createVendorCompany(data: {
  name: string;
  nameBn?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const existing = await prisma.vendorCompany.findUnique({ where: { name: data.name } });
  if (existing) throw new ApiError("Company already exists", 400);
  return prisma.vendorCompany.create({ data });
}
