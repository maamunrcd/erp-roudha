-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('ENROLLMENT', 'DOWNPAYMENT', 'PAYMENT', 'MANUAL');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "salesAgentId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "salesAgentId" TEXT;

-- CreateTable
CREATE TABLE "SalesAgent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    "projectId" TEXT,
    "basis" "CommissionBasis" NOT NULL DEFAULT 'DOWNPAYMENT',
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesAgent_userId_key" ON "SalesAgent"("userId");
CREATE INDEX "SalesAgent_isActive_idx" ON "SalesAgent"("isActive");
CREATE INDEX "SalesAgent_phone_idx" ON "SalesAgent"("phone");
CREATE INDEX "Commission_status_idx" ON "Commission"("status");
CREATE INDEX "Commission_agentId_idx" ON "Commission"("agentId");
CREATE INDEX "Commission_customerId_idx" ON "Commission"("customerId");
CREATE INDEX "Commission_createdAt_idx" ON "Commission"("createdAt");
CREATE INDEX "Lead_salesAgentId_idx" ON "Lead"("salesAgentId");
CREATE INDEX "Customer_salesAgentId_idx" ON "Customer"("salesAgentId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_salesAgentId_fkey" FOREIGN KEY ("salesAgentId") REFERENCES "SalesAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_salesAgentId_fkey" FOREIGN KEY ("salesAgentId") REFERENCES "SalesAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesAgent" ADD CONSTRAINT "SalesAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "SalesAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
