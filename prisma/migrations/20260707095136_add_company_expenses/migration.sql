-- CreateTable
CREATE TABLE "CompanyExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherNo" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "isProjectExpense" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "approvedBy" TEXT NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanyExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CompanyExpense_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyExpense_voucherNo_key" ON "CompanyExpense"("voucherNo");

-- CreateIndex
CREATE INDEX "CompanyExpense_expenseDate_idx" ON "CompanyExpense"("expenseDate");

-- CreateIndex
CREATE INDEX "CompanyExpense_category_idx" ON "CompanyExpense"("category");

-- CreateIndex
CREATE INDEX "CompanyExpense_isProjectExpense_idx" ON "CompanyExpense"("isProjectExpense");
