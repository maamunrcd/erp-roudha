-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED', 'SHARE_TO_SELL', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('DOWNPAYMENT', 'INSTALLMENT', 'UTILITIES', 'SAND_FILLING', 'DOCUMENT_VERIFICATION', 'MISCELLANEOUS', 'FULL_SETTLEMENT');

-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('INSTALLMENT', 'FULL_UPFRONT');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('NONE', 'FULLY_SETTLED', 'EARLY_SETTLED');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('FULL_AT_ENROLLMENT', 'EARLY_PAYOFF', 'FULL_UPFRONT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'MOBILE_BANKING');

-- CreateEnum
CREATE TYPE "ShareAllocationStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ALLOCATED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "GraceStatus" AS ENUM ('NONE', 'PAUSED', 'RECALCULATED');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('STANDARD', 'CUSTOM', 'MIXED_PHASE');

-- CreateEnum
CREATE TYPE "PricingSource" AS ENUM ('PHASE_DEFAULT', 'TWIN_COMBO', 'CUSTOM_OVERRIDE', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('PRE_OPERATIONAL_LEGAL', 'OFFICE_OPERATIONS', 'BRANDING_MARKETING', 'HR_CONSULTANCY');

-- CreateEnum
CREATE TYPE "ApprovingPartner" AS ENUM ('ADMIN', 'MANIK');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "installmentMonths" INTEGER NOT NULL DEFAULT 48,
    "totalShares" INTEGER NOT NULL DEFAULT 72,
    "publicShares" INTEGER NOT NULL DEFAULT 60,
    "dimensions" TEXT NOT NULL DEFAULT '{}',
    "layouts" TEXT NOT NULL DEFAULT '{}',
    "pricingPhases" TEXT NOT NULL DEFAULT '[]',
    "vendorCompanyId" TEXT,
    "landBuyPrice" DOUBLE PRECISION,
    "targetSellPrice" DOUBLE PRECISION,
    "companyPaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dealStartDate" TIMESTAMP(3),
    "dealEndDate" TIMESTAMP(3),
    "acquisitionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSerialCounter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSerial" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectSerialCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shareNumber" INTEGER NOT NULL,
    "allocationStatus" "ShareAllocationStatus" NOT NULL DEFAULT 'AVAILABLE',
    "activeCustomerId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nid" TEXT,
    "address" TEXT,
    "passwordHash" TEXT,
    "portalTemporaryPassword" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalPasswordReset" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nid" TEXT,
    "address" TEXT,
    "predecessorId" TEXT,
    "paymentPlan" "PaymentPlan" NOT NULL DEFAULT 'INSTALLMENT',
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'NONE',
    "graceStatus" "GraceStatus" NOT NULL DEFAULT 'NONE',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "contractStartDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContract" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pricingMode" "PricingMode" NOT NULL DEFAULT 'STANDARD',
    "useComboOffer" BOOLEAN NOT NULL DEFAULT false,
    "customTotalPrice" DOUBLE PRECISION,
    "customDownpayment" DOUBLE PRECISION,
    "customMonthlyAmount" DOUBLE PRECISION,
    "customInstallmentMonths" INTEGER,
    "discountAmount" DOUBLE PRECISION,
    "discountReason" TEXT,
    "approvedByUserId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CustomerContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAdjustmentLog" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "adjustedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "adjustedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAdjustmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerShare" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "downpaymentPortion" DOUBLE PRECISION NOT NULL,
    "monthlyInstallment" DOUBLE PRECISION NOT NULL,
    "pricingSource" "PricingSource" NOT NULL DEFAULT 'PHASE_DEFAULT',
    "phaseId" INTEGER,
    "contractId" TEXT,

    CONSTRAINT "CustomerShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLedger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "installmentIndex" INTEGER,
    "description" TEXT,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "graceStatus" "GraceStatus" NOT NULL DEFAULT 'NONE',
    "receiptId" TEXT,
    "settlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettlement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "settlementType" "SettlementType" NOT NULL,
    "totalAmountPaid" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "includeOptionalFees" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledByUserId" TEXT NOT NULL,
    "receiptId" TEXT,

    CONSTRAINT "PaymentSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "lastSerial" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyReceipt" (
    "id" TEXT NOT NULL,
    "receiptSlNo" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "installmentIndex" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
    "signatureAnchor" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "fileHash" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "MoneyReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareTransferLog" (
    "id" TEXT NOT NULL,
    "fromCustomerId" TEXT NOT NULL,
    "toCustomerId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "cutoffInstallment" INTEGER NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digitalLogSignature" TEXT NOT NULL,

    CONSTRAINT "ShareTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "isSoftLocked" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "projectId" TEXT,
    "customerId" TEXT,
    "transferLogId" TEXT,
    "paymentLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyExpense" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "isProjectExpense" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "approvedBy" "ApprovingPartner" NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VendorCompany_name_key" ON "VendorCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_prefix_key" ON "Project"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSerialCounter_projectId_year_key" ON "ProjectSerialCounter"("projectId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Share_projectId_shareNumber_key" ON "Share"("projectId", "shareNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_phone_key" ON "CustomerProfile"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PortalPasswordReset_tokenHash_key" ON "PortalPasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalPasswordReset_profileId_expiresAt_idx" ON "PortalPasswordReset"("profileId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_trackingId_key" ON "Customer"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContract_customerId_key" ON "CustomerContract"("customerId");

-- CreateIndex
CREATE INDEX "CustomerShare_shareId_isActive_idx" ON "CustomerShare"("shareId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLedger_customerId_purpose_installmentIndex_key" ON "PaymentLedger"("customerId", "purpose", "installmentIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettlement_receiptId_key" ON "PaymentSettlement"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyReceipt_receiptSlNo_key" ON "MoneyReceipt"("receiptSlNo");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyExpense_voucherNo_key" ON "CompanyExpense"("voucherNo");

-- CreateIndex
CREATE INDEX "CompanyExpense_expenseDate_idx" ON "CompanyExpense"("expenseDate");

-- CreateIndex
CREATE INDEX "CompanyExpense_category_idx" ON "CompanyExpense"("category");

-- CreateIndex
CREATE INDEX "CompanyExpense_isProjectExpense_idx" ON "CompanyExpense"("isProjectExpense");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "VendorCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSerialCounter" ADD CONSTRAINT "ProjectSerialCounter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_activeCustomerId_fkey" FOREIGN KEY ("activeCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalPasswordReset" ADD CONSTRAINT "PortalPasswordReset_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContract" ADD CONSTRAINT "CustomerContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAdjustmentLog" ADD CONSTRAINT "ContractAdjustmentLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CustomerContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAdjustmentLog" ADD CONSTRAINT "ContractAdjustmentLog_adjustedByUserId_fkey" FOREIGN KEY ("adjustedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerShare" ADD CONSTRAINT "CustomerShare_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerShare" ADD CONSTRAINT "CustomerShare_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerShare" ADD CONSTRAINT "CustomerShare_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CustomerContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLedger" ADD CONSTRAINT "PaymentLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLedger" ADD CONSTRAINT "PaymentLedger_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MoneyReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLedger" ADD CONSTRAINT "PaymentLedger_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PaymentSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_settledByUserId_fkey" FOREIGN KEY ("settledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSettlement" ADD CONSTRAINT "PaymentSettlement_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MoneyReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyReceipt" ADD CONSTRAINT "MoneyReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTransferLog" ADD CONSTRAINT "ShareTransferLog_fromCustomerId_fkey" FOREIGN KEY ("fromCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTransferLog" ADD CONSTRAINT "ShareTransferLog_toCustomerId_fkey" FOREIGN KEY ("toCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareTransferLog" ADD CONSTRAINT "ShareTransferLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_transferLogId_fkey" FOREIGN KEY ("transferLogId") REFERENCES "ShareTransferLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_paymentLedgerId_fkey" FOREIGN KEY ("paymentLedgerId") REFERENCES "PaymentLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyExpense" ADD CONSTRAINT "CompanyExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyExpense" ADD CONSTRAINT "CompanyExpense_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

