-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "installmentMonths" INTEGER NOT NULL DEFAULT 48,
    "totalShares" INTEGER NOT NULL DEFAULT 72,
    "publicShares" INTEGER NOT NULL DEFAULT 60,
    "dimensions" TEXT NOT NULL DEFAULT '{}',
    "layouts" TEXT NOT NULL DEFAULT '{}',
    "pricingPhases" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectSerialCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSerial" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectSerialCounter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "shareNumber" INTEGER NOT NULL,
    "allocationStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "activeCustomerId" TEXT,
    "reservedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Share_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Share_activeCustomerId_fkey" FOREIGN KEY ("activeCustomerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nid" TEXT,
    "address" TEXT,
    "predecessorId" TEXT,
    "paymentPlan" TEXT NOT NULL DEFAULT 'INSTALLMENT',
    "settlementStatus" TEXT NOT NULL DEFAULT 'NONE',
    "graceStatus" TEXT NOT NULL DEFAULT 'NONE',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "contractStartDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Customer_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'STANDARD',
    "customTotalPrice" REAL,
    "customDownpayment" REAL,
    "customMonthlyAmount" REAL,
    "customInstallmentMonths" INTEGER,
    "discountAmount" REAL,
    "discountReason" TEXT,
    "approvedByUserId" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "CustomerContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractAdjustmentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "adjustedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "adjustedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractAdjustmentLog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CustomerContract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContractAdjustmentLog_adjustedByUserId_fkey" FOREIGN KEY ("adjustedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "allocatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unitPrice" REAL NOT NULL,
    "downpaymentPortion" REAL NOT NULL,
    "monthlyInstallment" REAL NOT NULL,
    "pricingSource" TEXT NOT NULL DEFAULT 'PHASE_DEFAULT',
    "phaseId" INTEGER,
    "contractId" TEXT,
    CONSTRAINT "CustomerShare_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerShare_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerShare_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "CustomerContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "installmentIndex" INTEGER,
    "description" TEXT,
    "amountDue" REAL NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "graceStatus" TEXT NOT NULL DEFAULT 'NONE',
    "receiptId" TEXT,
    "settlementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentLedger_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MoneyReceipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentLedger_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PaymentSettlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "settlementType" TEXT NOT NULL,
    "totalAmountPaid" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "includeOptionalFees" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "settledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledByUserId" TEXT NOT NULL,
    "receiptId" TEXT,
    CONSTRAINT "PaymentSettlement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentSettlement_settledByUserId_fkey" FOREIGN KEY ("settledByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentSettlement_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MoneyReceipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "lastSerial" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "MoneyReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptSlNo" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "installmentIndex" INTEGER,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "signatureAnchor" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "fileHash" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    CONSTRAINT "MoneyReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShareTransferLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCustomerId" TEXT NOT NULL,
    "toCustomerId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "cutoffInstallment" INTEGER NOT NULL,
    "transferDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digitalLogSignature" TEXT NOT NULL,
    CONSTRAINT "ShareTransferLog_fromCustomerId_fkey" FOREIGN KEY ("fromCustomerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShareTransferLog_toCustomerId_fkey" FOREIGN KEY ("toCustomerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShareTransferLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileUrl" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "isSoftLocked" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "projectId" TEXT,
    "customerId" TEXT,
    "transferLogId" TEXT,
    "paymentLedgerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_transferLogId_fkey" FOREIGN KEY ("transferLogId") REFERENCES "ShareTransferLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_paymentLedgerId_fkey" FOREIGN KEY ("paymentLedgerId") REFERENCES "PaymentLedger" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_prefix_key" ON "Project"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSerialCounter_projectId_year_key" ON "ProjectSerialCounter"("projectId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Share_projectId_shareNumber_key" ON "Share"("projectId", "shareNumber");

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
