import { describeIntegration } from "./setup";
import {
  createTestUser,
  createTestProduct,
  createTestPhotoshoot,
  createTestGenerationJob,
} from "./helpers/factories";
import { creditService } from "@/lib/credits/service";
import { getTestPrisma } from "@/lib/test/prisma-client";

describeIntegration("credit recovery integration", () => {
  it("dry-run does not mutate reservations", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const job = await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
    });

    const prisma = getTestPrisma();
    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    await prisma.creditAccount.update({
      where: { id: account.id },
      data: { balance: 70, reserved: 30 },
    });
    await prisma.creditReservation.create({
      data: {
        userId: user.id,
        creditAccountId: account.id,
        generationJobId: job.id,
        credits: 30,
        status: "reserved",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    });

    const dryRun = await creditService.recoverStaleReservations({
      dryRun: true,
      olderThanMs: 60_000,
    });
    expect(dryRun.found).toBeGreaterThanOrEqual(1);
    expect(dryRun.recovered).toBe(0);

    const stillReserved = await prisma.creditReservation.findFirst({
      where: { generationJobId: job.id, status: "reserved" },
    });
    expect(stillReserved).not.toBeNull();
  });

  it("executes recovery and is idempotent", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const job = await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
    });

    const prisma = getTestPrisma();
    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    await prisma.creditAccount.update({
      where: { id: account.id },
      data: { balance: 70, reserved: 30 },
    });
    await prisma.creditReservation.create({
      data: {
        userId: user.id,
        creditAccountId: account.id,
        generationJobId: job.id,
        credits: 30,
        status: "reserved",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    });

    const first = await creditService.recoverStaleReservations({
      dryRun: false,
      olderThanMs: 60_000,
    });
    expect(first.recovered).toBeGreaterThanOrEqual(1);

    const after = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(after.reserved).toBe(0);
    expect(after.balance).toBe(100);

    const second = await creditService.recoverStaleReservations({
      dryRun: false,
      olderThanMs: 60_000,
    });
    expect(second.recovered).toBe(0);

    const txs = await prisma.creditTransaction.findMany({
      where: { userId: user.id, type: "generation_refund" },
    });
    expect(txs.length).toBeGreaterThanOrEqual(1);
  });

  it("does not recover active reservations", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const job = await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
    });

    const prisma = getTestPrisma();
    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    await prisma.creditAccount.update({
      where: { id: account.id },
      data: { balance: 70, reserved: 30 },
    });
    await prisma.creditReservation.create({
      data: {
        userId: user.id,
        creditAccountId: account.id,
        generationJobId: job.id,
        credits: 30,
        status: "reserved",
        createdAt: new Date(),
      },
    });

    const result = await creditService.recoverStaleReservations({
      dryRun: false,
      olderThanMs: 60_000,
    });
    expect(result.recovered).toBe(0);

    const still = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(still.reserved).toBe(30);
  });
});
