-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nid" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingId" TEXT NOT NULL,
    "profileId" TEXT,
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
    CONSTRAINT "Customer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CustomerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Customer_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "contractStartDate", "createdAt", "email", "fullName", "graceStatus", "id", "isPaused", "nid", "paymentPlan", "phone", "predecessorId", "projectId", "settlementStatus", "shareCount", "status", "trackingId", "updatedAt", "verificationStatus") SELECT "address", "contractStartDate", "createdAt", "email", "fullName", "graceStatus", "id", "isPaused", "nid", "paymentPlan", "phone", "predecessorId", "projectId", "settlementStatus", "shareCount", "status", "trackingId", "updatedAt", "verificationStatus" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_trackingId_key" ON "Customer"("trackingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_phone_key" ON "CustomerProfile"("phone");
