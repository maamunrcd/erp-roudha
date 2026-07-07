import { z } from "zod";
import { PaymentMethod, PaymentPlan, PaymentPurpose, PricingMode, SettlementType } from "@prisma/client";

export const enrollSchema = z
  .object({
    projectId: z.string(),
    shareCount: z.number().int().positive(),
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    nid: z.string().optional(),
    address: z.string().optional(),
    paymentPlan: z.nativeEnum(PaymentPlan).optional(),
    pricingMode: z.nativeEnum(PricingMode).optional(),
    useComboOffer: z.boolean().optional(),
    customTotalPrice: z.number().positive().optional(),
    customDownpayment: z.number().nonnegative().optional(),
    customMonthlyAmount: z.number().positive().optional(),
    customInstallmentMonths: z.number().int().min(1).max(120).optional(),
    contractStartDate: z.string().optional(),
    discountReason: z.string().optional(),
  })
  .refine(
    (data) =>
      data.pricingMode !== PricingMode.CUSTOM ||
      (data.customTotalPrice != null && data.customTotalPrice > 0),
    { message: "Custom pricing requires a total contract amount", path: ["customTotalPrice"] },
  );

export const paymentSchema = z.discriminatedUnion("purpose", [
  z.object({
    purpose: z.literal(PaymentPurpose.INSTALLMENT),
    customerId: z.string(),
    installmentIndex: z.number().int().min(1).max(120),
    amountPaid: z.number().positive(),
    paymentMethod: z.nativeEnum(PaymentMethod),
  }),
  z.object({
    purpose: z.enum([
      PaymentPurpose.DOWNPAYMENT,
      PaymentPurpose.UTILITIES,
      PaymentPurpose.SAND_FILLING,
      PaymentPurpose.DOCUMENT_VERIFICATION,
      PaymentPurpose.MISCELLANEOUS,
    ]),
    customerId: z.string(),
    amountPaid: z.number().positive(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    description: z.string().optional(),
  }),
]);

export const settleSchema = z.object({
  customerId: z.string(),
  amountPaid: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  settlementType: z.nativeEnum(SettlementType),
  includeOptionalFees: z.boolean().optional(),
  adminNote: z.string().optional(),
});

export const transferSchema = z.object({
  fromCustomerId: z.string(),
  shareId: z.string(),
  cutoffInstallment: z.number().int().min(0).max(120),
  successor: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    nid: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const pricingPhaseSchema = z
  .object({
    id: z.number().int().positive().optional(),
    label: z.string().min(1),
    shares: z.string().optional(),
    shareFrom: z.number().int().min(1),
    shareTo: z.number().int().min(1),
    singlePrice: z.number().positive(),
    twinComboPrice: z.number().positive(),
    downpayment: z.number().nonnegative(),
    monthly: z.number().nonnegative().optional(),
  })
  .refine((p) => p.shareFrom <= p.shareTo, { message: "shareFrom must be <= shareTo" });

export const projectSchema = z.object({
  prefix: z.string().min(2).max(12),
  name: z.string().min(2),
  nameBn: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).optional(),
  installmentMonths: z.number().int().min(1).max(120).optional(),
  totalShares: z.number().int().min(0).optional(),
  publicShares: z.number().int().min(0).optional(),
  dimensions: z.record(z.unknown()).optional(),
  layouts: z.record(z.unknown()).optional(),
  pricingPhases: z.array(pricingPhaseSchema).optional(),
  vendorCompanyId: z.string().nullable().optional(),
  landBuyPrice: z.number().nonnegative().nullable().optional(),
  targetSellPrice: z.number().nonnegative().nullable().optional(),
  companyPaidAmount: z.number().nonnegative().optional(),
  dealStartDate: z.string().nullable().optional(),
  dealEndDate: z.string().nullable().optional(),
  acquisitionNotes: z.string().nullable().optional(),
});

export const projectUpdateSchema = projectSchema.partial();

export const customerUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().nullable().optional(),
  nid: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED", "PAUSED", "SHARE_TO_SELL", "TRANSFERRED"]).optional(),
  portalPassword: z.string().min(4).optional(),
  graceStatus: z.enum(["NONE", "PAUSED", "RECALCULATED"]).optional(),
  isPaused: z.boolean().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(2),
  nameBn: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseBaseSchema = z.object({
  voucherNo: z.string().min(1).max(64),
  category: z.enum([
    "PRE_OPERATIONAL_LEGAL",
    "OFFICE_OPERATIONS",
    "BRANDING_MARKETING",
    "HR_CONSULTANCY",
  ]),
  description: z.string().optional(),
  amount: z.number().positive(),
  expenseDate: z.string(),
  isProjectExpense: z.boolean().default(false),
  projectId: z.string().nullable().optional(),
  approvedBy: z.enum(["ADMIN", "MANIK"]),
});

export const expenseSchema = expenseBaseSchema
  .refine((data) => !data.isProjectExpense || !!data.projectId, {
    message: "Project expenses require a project",
    path: ["projectId"],
  })
  .refine((data) => data.isProjectExpense || !data.projectId, {
    message: "Overhead expenses cannot be linked to a project",
    path: ["projectId"],
  });

export const expenseUpdateSchema = expenseBaseSchema.partial();
