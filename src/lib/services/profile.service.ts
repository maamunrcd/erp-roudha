import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/services/customer-summary.service";

export async function findProfileByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  const profile = await prisma.customerProfile.findUnique({
    where: { phone: normalized },
    include: {
      enrollments: {
        include: {
          project: { select: { id: true, prefix: true, name: true } },
          shareAllocations: {
            where: { isActive: true },
            include: { share: { select: { shareNumber: true } } },
          },
        },
      },
    },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    nid: profile.nid,
    address: profile.address,
    enrollments: profile.enrollments.map((e) => ({
      customerId: e.id,
      trackingId: e.trackingId,
      project: e.project,
      shareCount: e.shareCount,
    })),
  };
}
