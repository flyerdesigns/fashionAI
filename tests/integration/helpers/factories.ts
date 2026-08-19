import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { creditService } from "@/lib/credits/service";
import { seedProductImage } from "./storage-seed";

const TEST_EMAIL_PREFIX = "integration-test-";

export function testEmail(suffix = ""): string {
  return `${TEST_EMAIL_PREFIX}${suffix || randomUUID()}@test.local`;
}

export async function createTestUser(options?: {
  role?: "user" | "admin";
  email?: string;
  withCredits?: boolean;
}) {
  const prisma = getTestPrisma();
  const email = options?.email ?? testEmail();
  const user = await prisma.user.create({
    data: {
      name: "Integration Test User",
      email,
      provider: "credentials",
      role: options?.role ?? "user",
      passwordHash: await bcrypt.hash("password12345", 10),
    },
  });

  if (options?.withCredits !== false) {
    await creditService.ensureAccount(user.id, true);
  }

  return user;
}

export async function createTestProduct(userId: string, options?: { withImage?: boolean }) {
  const prisma = getTestPrisma();
  const productId = randomUUID();
  const originalImageKey = `users/${userId}/products/${productId}/original/test.png`;
  const product = await prisma.product.create({
    data: {
      userId,
      name: "Test Product",
      type: "shirt",
      category: "tops",
      gender: "unisex",
      color: "black",
      status: "active",
      originalFileName: "test.png",
      originalImageKey,
      originalImageMimeType: "image/png",
      originalImageSize: 1024,
      width: 100,
      height: 100,
    },
  });

  if (options?.withImage !== false) {
    await seedProductImage(originalImageKey);
  }

  return product;
}

export async function setUserCredits(userId: string, balance: number): Promise<void> {
  const prisma = getTestPrisma();
  await creditService.ensureAccount(userId, false);
  await prisma.creditAccount.update({
    where: { userId },
    data: { balance, reserved: 0, lifetimeGranted: balance },
  });
}

export async function createTestPhotoshoot(userId: string, productId: string) {
  const prisma = getTestPrisma();
  return prisma.photoshoot.create({
    data: {
      userId,
      productId,
      productNameSnapshot: "Test Product",
      configuration: {},
      generationId: randomUUID(),
      status: "processing",
      provider: "gemini",
      totalImages: 0,
      completedImages: 0,
    },
  });
}

export async function createTestGenerationJob(input: {
  userId: string;
  photoshootId: string;
  productId: string;
  requestId?: string;
  status?: string;
}) {
  const prisma = getTestPrisma();
  return prisma.generationJob.create({
    data: {
      userId: input.userId,
      photoshootId: input.photoshootId,
      productId: input.productId,
      provider: "gemini",
      type: "photoshoot",
      status: input.status ?? "queued",
      requestId: input.requestId ?? null,
      totalImages: 4,
      completedImages: 0,
      failedImages: 0,
      progress: 0,
    },
  });
}

export async function cleanupIntegrationTestData(): Promise<void> {
  const prisma = getTestPrisma();

  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  const creditAccounts = await prisma.creditAccount.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const creditAccountIds = creditAccounts.map((account) => account.id);

  await prisma.auditLog.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { targetUserId: { in: userIds } }] },
  });
  await prisma.usageRecord.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.creditReservation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.creditTransaction.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { creditAccountId: { in: creditAccountIds } }],
    },
  });
  await prisma.generationImage.deleteMany({
    where: { photoshoot: { userId: { in: userIds } } },
  });
  await prisma.generationJob.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.videoGenerationJob.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.video.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.photoshoot.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { product: { userId: { in: userIds } } }],
    },
  });
  await prisma.product.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.creditAccount.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.stripeEvent.deleteMany({});
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.workerHeartbeat.deleteMany({});
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
