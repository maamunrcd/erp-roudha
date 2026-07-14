import { z } from "zod";
import { PaymentMethod, PaymentPlan, PaymentPurpose, PricingMode, SettlementType } from "@prisma/client";

const optionalEmail = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().email().optional(),
);

export const enrollSchema = z
  .object({
    projectId: z.string(),
    shareCount: z.number().int().positive(),
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: optionalEmail,
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
    salesAgentId: z.string().nullable().optional(),
    leadId: z.string().nullable().optional(),
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
    email: optionalEmail,
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
  registrationStage: z
    .enum([
      "NOT_STARTED",
      "AGREEMENT_SIGNED",
      "DEED_PREPARATION",
      "MUTATION_PENDING",
      "MUTATION_DONE",
      "REGISTRY_PENDING",
      "REGISTRY_DONE",
      "HANDOVER_DONE",
    ])
    .optional(),
  registrationNotes: z.string().nullable().optional(),
});

export const leadSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: optionalEmail,
  source: z.enum(["WALK_IN", "PHONE", "WHATSAPP", "REFERRAL", "FACEBOOK", "OTHER"]).optional(),
  status: z.enum(["NEW", "CONTACTED", "SITE_VISIT", "NEGOTIATING", "CONVERTED", "LOST"]).optional(),
  interestNotes: z.string().optional(),
  projectId: z.string().nullable().optional(),
  assignedToUserId: z.string().nullable().optional(),
  salesAgentId: z.string().nullable().optional(),
  nextFollowUpAt: z.string().nullable().optional(),
  siteVisitAt: z.string().nullable().optional(),
  siteVisitNotes: z.string().nullable().optional(),
  lostReason: z.string().nullable().optional(),
});

export const leadUpdateSchema = leadSchema.partial();

export const salesAgentSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: optionalEmail,
  isActive: z.boolean().optional(),
  defaultCommissionPct: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  userId: z.string().nullable().optional(),
});

export const salesAgentUpdateSchema = salesAgentSchema.partial();

export const commissionSchema = z.object({
  agentId: z.string().min(1),
  customerId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  basis: z.enum(["ENROLLMENT", "DOWNPAYMENT", "PAYMENT", "MANUAL"]).optional(),
  ratePercent: z.number().min(0).max(100),
  baseAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const commissionStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]),
});

export const reminderSchema = z.object({
  title: z.string().min(2),
  type: z.enum(["FOLLOW_UP", "SITE_VISIT", "INSTALLMENT_DUE", "DOCUMENT", "REGISTRATION", "CUSTOM"]).optional(),
  dueAt: z.string(),
  notes: z.string().optional(),
  leadId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
});

export const reminderUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(["FOLLOW_UP", "SITE_VISIT", "INSTALLMENT_DUE", "DOCUMENT", "REGISTRATION", "CUSTOM"]).optional(),
  status: z.enum(["PENDING", "DONE", "CANCELLED"]).optional(),
  dueAt: z.string().optional(),
  notes: z.string().nullable().optional(),
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

export const landValuationSchema = z.object({
  projectId: z.string().min(1),
  valuedAt: z.string().min(1),
  landValue: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const developerAgreementSchema = z.object({
  projectId: z.string().min(1),
  developerName: z.string().min(2),
  contactPhone: z.string().optional(),
  contactEmail: optionalEmail,
  signedAt: z.string().nullable().optional(),
  ourSharePercent: z.number().min(0).max(100).nullable().optional(),
  developerSharePercent: z.number().min(0).max(100).nullable().optional(),
  constructionStart: z.string().nullable().optional(),
  expectedCompletion: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "SIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  milestones: z.array(z.unknown()).optional(),
  notes: z.string().optional(),
});

export const developerAgreementUpdateSchema = developerAgreementSchema.omit({ projectId: true }).partial();

export const flatSchema = z.object({
  projectId: z.string().min(1),
  code: z.string().min(1),
  building: z.string().optional(),
  floor: z.number().int().nullable().optional(),
  flatNumber: z.string().optional(),
  sizeSqft: z.number().nonnegative().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(["PLANNED", "AVAILABLE", "RESERVED", "ALLOCATED", "HANDED_OVER"]).optional(),
  notes: z.string().optional(),
});

export const flatUpdateSchema = flatSchema.omit({ projectId: true }).partial();

export const flatAllocateSchema = z.object({
  customerId: z.string().min(1),
  shareIds: z.array(z.string()).optional(),
});

export const handoverSchema = z.object({
  customerId: z.string().min(1),
  flatId: z.string().nullable().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  keysDelivered: z.boolean().optional(),
  documentsDelivered: z.boolean().optional(),
  snagNotes: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  handedOverAt: z.string().nullable().optional(),
});
