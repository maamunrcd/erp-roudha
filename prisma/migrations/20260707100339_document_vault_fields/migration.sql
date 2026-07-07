-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_transferLogId_fkey" FOREIGN KEY ("transferLogId") REFERENCES "ShareTransferLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_paymentLedgerId_fkey" FOREIGN KEY ("paymentLedgerId") REFERENCES "PaymentLedger" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "customerId", "fileUrl", "id", "isSoftLocked", "label", "paymentLedgerId", "projectId", "sha256Hash", "transferLogId") SELECT "createdAt", "customerId", "fileUrl", "id", "isSoftLocked", "label", "paymentLedgerId", "projectId", "sha256Hash", "transferLogId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
