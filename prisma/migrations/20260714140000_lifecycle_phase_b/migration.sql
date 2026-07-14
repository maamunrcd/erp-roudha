-- CreateEnum
CREATE TYPE "DeveloperAgreementStatus" AS ENUM ('DRAFT', 'SIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FlatStatus" AS ENUM ('PLANNED', 'AVAILABLE', 'RESERVED', 'ALLOCATED', 'HANDED_OVER');
CREATE TYPE "HandoverStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable LandValuation
CREATE TABLE "LandValuation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "valuedAt" TIMESTAMP(3) NOT NULL,
    "landValue" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable DeveloperAgreement
CREATE TABLE "DeveloperAgreement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "developerName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "signedAt" TIMESTAMP(3),
    "ourSharePercent" DOUBLE PRECISION,
    "developerSharePercent" DOUBLE PRECISION,
    "constructionStart" TIMESTAMP(3),
    "expectedCompletion" TIMESTAMP(3),
    "status" "DeveloperAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "milestones" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeveloperAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable Flat
CREATE TABLE "Flat" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "building" TEXT,
    "floor" INTEGER,
    "flatNumber" TEXT,
    "sizeSqft" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "status" "FlatStatus" NOT NULL DEFAULT 'PLANNED',
    "customerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flat_pkey" PRIMARY KEY ("id")
);

-- CreateTable FlatShareLink
CREATE TABLE "FlatShareLink" (
    "id" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlatShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable Handover
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "flatId" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "keysDelivered" BOOLEAN NOT NULL DEFAULT false,
    "documentsDelivered" BOOLEAN NOT NULL DEFAULT false,
    "snagNotes" TEXT,
    "notes" TEXT,
    "handedOverAt" TIMESTAMP(3),
    "recordedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LandValuation_projectId_valuedAt_idx" ON "LandValuation"("projectId", "valuedAt");
CREATE INDEX "DeveloperAgreement_projectId_idx" ON "DeveloperAgreement"("projectId");
CREATE INDEX "DeveloperAgreement_status_idx" ON "DeveloperAgreement"("status");
CREATE UNIQUE INDEX "Flat_projectId_code_key" ON "Flat"("projectId", "code");
CREATE INDEX "Flat_projectId_status_idx" ON "Flat"("projectId", "status");
CREATE INDEX "Flat_customerId_idx" ON "Flat"("customerId");
CREATE UNIQUE INDEX "FlatShareLink_shareId_key" ON "FlatShareLink"("shareId");
CREATE INDEX "FlatShareLink_flatId_idx" ON "FlatShareLink"("flatId");
CREATE UNIQUE INDEX "Handover_customerId_key" ON "Handover"("customerId");
CREATE INDEX "Handover_projectId_status_idx" ON "Handover"("projectId", "status");

ALTER TABLE "LandValuation" ADD CONSTRAINT "LandValuation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandValuation" ADD CONSTRAINT "LandValuation_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeveloperAgreement" ADD CONSTRAINT "DeveloperAgreement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Flat" ADD CONSTRAINT "Flat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Flat" ADD CONSTRAINT "Flat_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FlatShareLink" ADD CONSTRAINT "FlatShareLink_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlatShareLink" ADD CONSTRAINT "FlatShareLink_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
