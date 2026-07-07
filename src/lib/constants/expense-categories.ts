import type { ApprovingPartner, ExpenseCategory } from "@prisma/client";

export const EXPENSE_CATEGORY_LABELS: Record<
  ExpenseCategory,
  { en: string; bn: string }
> = {
  PRE_OPERATIONAL_LEGAL: {
    en: "Pre-operational & Legal",
    bn: "প্রাক-পরিচালনা ও আইনি",
  },
  OFFICE_OPERATIONS: {
    en: "Office Operations",
    bn: "অফিস পরিচালনা",
  },
  BRANDING_MARKETING: {
    en: "Branding & Marketing",
    bn: "ব্র্যান্ডিং ও মার্কেটিং",
  },
  HR_CONSULTANCY: {
    en: "HR & Consultancy",
    bn: "এইচআর ও পরামর্শক",
  },
};

export const APPROVING_PARTNER_LABELS: Record<ApprovingPartner, string> = {
  ADMIN: "Admin",
  MANIK: "Manik",
};

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "PRE_OPERATIONAL_LEGAL",
  "OFFICE_OPERATIONS",
  "BRANDING_MARKETING",
  "HR_CONSULTANCY",
];
