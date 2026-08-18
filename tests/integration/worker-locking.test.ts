import { describeIntegration } from "./setup";
import {
  createTestUser,
  createTestProduct,
  createTestPhotoshoot,
  createTestGenerationJob,
} from "./helpers/factories";
import { PostgresGenerationJobRepository } from "@/lib/generation/postgres-repository";

describeIntegration("worker job locking integration", () => {
  it("allows only one worker to claim the same queued job", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    await createTestGenerationJob({
      userId: user.id,
      photoshootId: photoshoot.id,
      productId: product.id,
      status: "queued",
    });

    const repo = new PostgresGenerationJobRepository();
    const [claimA, claimB] = await Promise.all([
      repo.claimNextJob("worker-a"),
      repo.claimNextJob("worker-b"),
    ]);

    const claims = [claimA, claimB].filter(Boolean);
    expect(claims).toHaveLength(1);

    const prisma = (await import("@/lib/test/prisma-client")).getTestPrisma();
    const dbJob = await prisma.generationJob.findUniqueOrThrow({
      where: { id: claims[0]!.id },
    });
    expect(dbJob.lockedBy).toMatch(/worker-(a|b)/);
  });
});
