import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function wipeAllData() {
  await prisma.portalPasswordReset.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.companyExpense.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.document.deleteMany();
  await prisma.moneyReceipt.deleteMany();
  await prisma.paymentSettlement.deleteMany();
  await prisma.paymentLedger.deleteMany();
  await prisma.shareTransferLog.deleteMany();
  await prisma.contractAdjustmentLog.deleteMany();
  await prisma.customerShare.deleteMany();
  await prisma.customerContract.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.share.deleteMany();
  await prisma.projectSerialCounter.deleteMany();
  await prisma.project.deleteMany();
  await prisma.vendorCompany.deleteMany();
  await prisma.user.deleteMany();
  await prisma.receiptCounter.deleteMany();
}

async function main() {
  await wipeAllData();

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@raudha.properties";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const hash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      passwordHash: hash,
    },
  });

  await prisma.receiptCounter.create({
    data: { id: "global", lastSerial: 0 },
  });

  console.log("Fresh database ready.");
  console.log("Admin login:", email, "/", password);
  console.log("No projects, customers, or sample data — add projects from Admin → Projects.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
