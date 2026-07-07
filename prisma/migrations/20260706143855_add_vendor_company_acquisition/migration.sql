-- CreateTable
CREATE TABLE "VendorCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
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
    "vendorCompanyId" TEXT,
    "landBuyPrice" REAL,
    "targetSellPrice" REAL,
    "companyPaidAmount" REAL NOT NULL DEFAULT 0,
    "dealStartDate" DATETIME,
    "dealEndDate" DATETIME,
    "acquisitionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "VendorCompany" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "dimensions", "id", "installmentMonths", "layouts", "name", "nameBn", "prefix", "pricingPhases", "publicShares", "status", "totalShares", "updatedAt") SELECT "createdAt", "dimensions", "id", "installmentMonths", "layouts", "name", "nameBn", "prefix", "pricingPhases", "publicShares", "status", "totalShares", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_prefix_key" ON "Project"("prefix");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VendorCompany_name_key" ON "VendorCompany"("name");
