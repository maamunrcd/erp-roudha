-- CreateTable
CREATE TABLE "PortalPasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalPasswordReset_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CustomerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nid" TEXT,
    "address" TEXT,
    "passwordHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CustomerProfile" ("address", "createdAt", "email", "fullName", "id", "nid", "passwordHash", "phone", "updatedAt") SELECT "address", "createdAt", "email", "fullName", "id", "nid", "passwordHash", "phone", "updatedAt" FROM "CustomerProfile";
DROP TABLE "CustomerProfile";
ALTER TABLE "new_CustomerProfile" RENAME TO "CustomerProfile";
CREATE UNIQUE INDEX "CustomerProfile_phone_key" ON "CustomerProfile"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PortalPasswordReset_tokenHash_key" ON "PortalPasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalPasswordReset_profileId_expiresAt_idx" ON "PortalPasswordReset"("profileId", "expiresAt");
