import { describeIntegration } from "./setup";
import {
  createTestUser,
  createTestGenerationJob,
  createTestPhotoshoot,
  createTestProduct,
} from "./helpers/factories";
import { creditService } from "@/lib/credits/service";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { randomUUID } from "crypto";

describeIntegration("credit system integration", () => {
  it("creates signup bonus account once", async () => {
    const user = await createTestUser({ withCredits: true });
    const balance = await creditService.getBalance(user.id);

    expect(balance.balance).toBeGreaterThanOrEqual(0);

    await creditService.ensureAccount(user.id, true);
    const again = await creditService.getBalance(user.id);
    expect(again.balance).toBe(balance.balance);
  });

  it("reserves credits atomically for generation job", async () => {
    const user = await createTestUser();
    const prisma = getTestPrisma();

    await prisma.creditAccount.update({
      where: { userId: user.id },
      data: { balance: 100, reserved: 0, lifetimeGranted: 100 },
    });

    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const job = await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
    });

    await creditService.reserve(user.id, job.id, 20);

    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.balance).toBe(80);
    expect(account.reserved).toBe(20);
  });

  it("prevents overspending under concurrent reservations", async () => {
    const user = await createTestUser();
    const prisma = getTestPrisma();

    await prisma.creditAccount.update({
      where: { userId: user.id },
      data: { balance: 30, reserved: 0, lifetimeGranted: 30 },
    });

    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);

    const jobs = await Promise.all(
      Array.from({ length: 3 }).map(() =>
        createTestGenerationJob({
          userId: user.id,
          photoshootId: photoshoot.id,
          productId: product.id,
        }),
      ),
    );

    const results = await Promise.allSettled(
      jobs.map((job) => creditService.reserve(user.id, job.id, 20)),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(1);

    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.balance).toBe(10);
    expect(account.reserved).toBe(20);
  });

  it("settles partial failure correctly", async () => {
    const user = await createTestUser();
    const prisma = getTestPrisma();

    await prisma.creditAccount.update({
      where: { userId: user.id },
      data: { balance: 80, reserved: 20, lifetimeGranted: 100 },
    });

    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const job = await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
    });

    await prisma.creditReservation.create({
      data: {
        userId: user.id,
        creditAccountId: (await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } })).id,
        generationJobId: job.id,
        credits: 20,
        status: "reserved",
      },
    });

    await creditService.settleGenerationJob({
      generationJobId: job.id,
      userId: user.id,
      photoshootId: photoshoot.id,
      provider: "gemini",
      operation: "photoshoot_image",
      costPerImage: 5,
      completedImages: 3,
      failedImages: 1,
      cancelledImages: 0,
    });

    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.reserved).toBe(0);
    expect(account.balance).toBe(85);
    expect(account.lifetimeConsumed).toBe(15);
  });

  it("enforces generation job idempotency via requestId", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const requestId = randomUUID();

    const job1 = await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
      requestId,
    });

    const prisma = getTestPrisma();
    const duplicate = await prisma.generationJob.create({
      data: {
        userId: user.id,
        photoshootId: photoshoot.id,
        productId: product.id,
        provider: "gemini",
        type: "photoshoot",
        status: "queued",
        requestId,
        totalImages: 1,
        completedImages: 0,
        failedImages: 0,
        progress: 0,
      },
    }).catch(() => null);

    expect(job1.requestId).toBe(requestId);
    expect(duplicate).toBeNull();
  });
});
