-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'STANDARD',
    "useComboOffer" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_CustomerContract" ("approvedAt", "approvedByUserId", "contractStartDate", "customDownpayment", "customInstallmentMonths", "customMonthlyAmount", "customTotalPrice", "customerId", "discountAmount", "discountReason", "effectiveFrom", "id", "notes", "pricingMode") SELECT "approvedAt", "approvedByUserId", "contractStartDate", "customDownpayment", "customInstallmentMonths", "customMonthlyAmount", "customTotalPrice", "customerId", "discountAmount", "discountReason", "effectiveFrom", "id", "notes", "pricingMode" FROM "CustomerContract";
DROP TABLE "CustomerContract";
ALTER TABLE "new_CustomerContract" RENAME TO "CustomerContract";
CREATE UNIQUE INDEX "CustomerContract_customerId_key" ON "CustomerContract"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
