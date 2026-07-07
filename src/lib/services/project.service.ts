import { prisma, HEAVY_TX_OPTIONS } from "@/lib/prisma";
import { summarizeLedgers } from "@/lib/services/customer-summary.service";
import { ApiError } from "@/lib/api-utils";
import { validatePricingPhases, normalizePricingPhases } from "@/lib/utils/pricing-phases";
import { ProjectStatus, ShareAllocationStatus } from "@prisma/client";
import type { PricingPhase } from "@/lib/constants/projects";

export interface CreateProjectInput {
  prefix: string;
  name: string;
  nameBn?: string;
  status?: ProjectStatus;
  installmentMonths?: number;
  totalShares?: number;
  publicShares?: number;
  dimensions?: object;
  layouts?: object;
  pricingPhases?: PricingPhase[];
  vendorCompanyId?: string | null;
  landBuyPrice?: number | null;
  targetSellPrice?: number | null;
  companyPaidAmount?: number;
  dealStartDate?: string | null;
  dealEndDate?: string | null;
  acquisitionNotes?: string | null;
}

export async function createProject(input: CreateProjectInput) {
  const prefix = input.prefix.trim().toUpperCase();
  const totalShares = input.totalShares ?? 0;
  const installmentMonths = input.installmentMonths ?? 48;
  const pricingPhases = normalizePricingPhases(input.pricingPhases ?? [], installmentMonths);
  const phaseError = validatePricingPhases(pricingPhases, totalShares);
  if (phaseError) throw new ApiError(phaseError, 400);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.project.findUnique({ where: { prefix } });
    if (existing) throw new ApiError(`Project prefix ${prefix} already exists`, 400);

    const project = await tx.project.create({
      data: {
        prefix,
        name: input.name,
        nameBn: input.nameBn,
        status: input.status ?? ProjectStatus.PLANNING,
        installmentMonths: input.installmentMonths ?? 48,
        totalShares,
        publicShares: input.publicShares ?? totalShares,
        dimensions: JSON.stringify(input.dimensions ?? {}),
        layouts: JSON.stringify(input.layouts ?? {}),
        pricingPhases: JSON.stringify(pricingPhases),
        vendorCompanyId: input.vendorCompanyId ?? undefined,
        landBuyPrice: input.landBuyPrice ?? undefined,
        targetSellPrice: input.targetSellPrice ?? undefined,
        companyPaidAmount: input.companyPaidAmount ?? 0,
        dealStartDate: input.dealStartDate ? new Date(input.dealStartDate) : undefined,
        dealEndDate: input.dealEndDate ? new Date(input.dealEndDate) : undefined,
        acquisitionNotes: input.acquisitionNotes ?? undefined,
      },
    });

    if (totalShares > 0) {
      await tx.share.createMany({
        data: Array.from({ length: totalShares }, (_, index) => ({
          projectId: project.id,
          shareNumber: index + 1,
        })),
      });
    }

    return project;
  }, HEAVY_TX_OPTIONS);
}

export async function updateProject(id: string, input: Partial<CreateProjectInput>) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Project not found", 404);

  const data: Record<string, unknown> = {};
  if (input.prefix) data.prefix = input.prefix.trim().toUpperCase();
  if (input.name) data.name = input.name;
  if (input.nameBn !== undefined) data.nameBn = input.nameBn;
  if (input.status) data.status = input.status;
  if (input.installmentMonths) data.installmentMonths = input.installmentMonths;
  if (input.totalShares !== undefined) data.totalShares = input.totalShares;
  if (input.publicShares !== undefined) data.publicShares = input.publicShares;
  if (input.dimensions) data.dimensions = JSON.stringify(input.dimensions);
  if (input.layouts) data.layouts = JSON.stringify(input.layouts);
  if (input.pricingPhases !== undefined) {
    const installmentMonths = input.installmentMonths ?? existing.installmentMonths;
    const totalShares = input.totalShares ?? existing.totalShares;
    const pricingPhases = normalizePricingPhases(input.pricingPhases, installmentMonths);
    const phaseError = validatePricingPhases(pricingPhases, totalShares);
    if (phaseError) throw new ApiError(phaseError, 400);
    data.pricingPhases = JSON.stringify(pricingPhases);
  }
  if (input.vendorCompanyId !== undefined) data.vendorCompanyId = input.vendorCompanyId;
  if (input.landBuyPrice !== undefined) data.landBuyPrice = input.landBuyPrice;
  if (input.targetSellPrice !== undefined) data.targetSellPrice = input.targetSellPrice;
  if (input.companyPaidAmount !== undefined) data.companyPaidAmount = input.companyPaidAmount;
  if (input.dealStartDate !== undefined) data.dealStartDate = input.dealStartDate ? new Date(input.dealStartDate) : null;
  if (input.dealEndDate !== undefined) data.dealEndDate = input.dealEndDate ? new Date(input.dealEndDate) : null;
  if (input.acquisitionNotes !== undefined) data.acquisitionNotes = input.acquisitionNotes;

  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string) {
  const customerCount = await prisma.customer.count({ where: { projectId: id } });
  if (customerCount > 0) {
    throw new ApiError("Cannot delete project with enrolled customers", 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.share.deleteMany({ where: { projectId: id } });
    await tx.projectSerialCounter.deleteMany({ where: { projectId: id } });
    await tx.project.delete({ where: { id } });
  });
}

export async function getProjectDetail(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      vendorCompany: { select: { id: true, name: true, phone: true } },
      shares: {
        select: {
          id: true,
          shareNumber: true,
          allocationStatus: true,
          activeCustomer: { select: { trackingId: true, fullName: true } },
        },
        orderBy: { shareNumber: "asc" },
      },
      customers: {
        include: {
          profile: { select: { id: true, phone: true } },
          contract: { select: { pricingMode: true } },
          shareAllocations: {
            where: { isActive: true },
            include: { share: { select: { shareNumber: true } } },
          },
          paymentLedgers: {
            where: { isFrozen: false },
            select: { amountDue: true, amountPaid: true, status: true, purpose: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) return null;

  const sharesSold = project.shares.filter(
    (s) => s.allocationStatus === ShareAllocationStatus.ALLOCATED || s.allocationStatus === ShareAllocationStatus.TRANSFERRED,
  ).length;
  const sharesAvailable = project.shares.filter((s) => s.allocationStatus === ShareAllocationStatus.AVAILABLE).length;

  const customers = project.customers.map((c) => {
    const financials = summarizeLedgers(c.paymentLedgers);
    const downpayment = c.paymentLedgers.find((l) => l.purpose === "DOWNPAYMENT");
    return {
      id: c.id,
      trackingId: c.trackingId,
      fullName: c.fullName,
      phone: c.phone,
      status: c.status,
      shareCount: c.shareCount,
      pricingMode: c.contract?.pricingMode ?? "STANDARD",
      profileId: c.profileId,
      otherProjects: 0,
      downpaymentStatus: downpayment?.status ?? "PENDING",
      ...financials,
    };
  });

  // Count other project enrollments per profile
  const profileIds = [...new Set(customers.map((c) => c.profileId).filter(Boolean))] as string[];
  if (profileIds.length) {
    const counts = await prisma.customer.groupBy({
      by: ["profileId"],
      where: { profileId: { in: profileIds } },
      _count: { id: true },
    });
    const countMap = Object.fromEntries(counts.map((c) => [c.profileId, c._count.id]));
    for (const c of customers) {
      if (c.profileId) c.otherProjects = Math.max(0, (countMap[c.profileId] ?? 1) - 1);
    }
  }

  const totals = customers.reduce(
    (acc, c) => ({
      totalDue: acc.totalDue + c.totalDue,
      totalPaid: acc.totalPaid + c.totalPaid,
      remaining: acc.remaining + c.remaining,
    }),
    { totalDue: 0, totalPaid: 0, remaining: 0 },
  );

  return {
    project: {
      id: project.id,
      prefix: project.prefix,
      name: project.name,
      nameBn: project.nameBn,
      status: project.status,
      installmentMonths: project.installmentMonths,
      totalShares: project.totalShares,
      publicShares: project.publicShares,
      dimensions: JSON.parse(project.dimensions),
      layouts: JSON.parse(project.layouts),
      pricingPhases: JSON.parse(project.pricingPhases),
      vendorCompanyId: project.vendorCompanyId,
      vendorCompany: project.vendorCompany,
      landBuyPrice: project.landBuyPrice,
      targetSellPrice: project.targetSellPrice,
      companyPaidAmount: project.companyPaidAmount,
      companyDue: Math.max(0, (project.landBuyPrice ?? 0) - (project.companyPaidAmount ?? 0)),
      dealStartDate: project.dealStartDate?.toISOString() ?? null,
      dealEndDate: project.dealEndDate?.toISOString() ?? null,
      acquisitionNotes: project.acquisitionNotes,
    },
    stats: {
      sharesSold,
      sharesAvailable,
      sharesTotal: project.shares.length,
      customerCount: customers.length,
      ...totals,
    },
    customers,
    shares: project.shares.map((s) => ({
      id: s.id,
      shareNumber: s.shareNumber,
      allocationStatus: s.allocationStatus,
      holderTrackingId: s.activeCustomer?.trackingId ?? null,
      holderName: s.activeCustomer?.fullName ?? null,
    })),
    availableShareCount: sharesAvailable,
    pricingConfigured: (() => {
      try {
        const phases = JSON.parse(project.pricingPhases);
        return Array.isArray(phases) && phases.length > 0;
      } catch {
        return false;
      }
    })(),
  };
}
