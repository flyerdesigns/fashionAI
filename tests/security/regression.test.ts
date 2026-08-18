import { vi } from "vitest";
import { describeIntegration } from "../integration/setup";
import { createTestUser, createTestProduct } from "../integration/helpers/factories";
import { mockAuthForUser } from "../integration/helpers/auth-session";
import { setUserCredits } from "../integration/helpers/factories";
import { GET as productsGet } from "@/app/api/products/[id]/route";
import { GET as adminStatsGet } from "@/app/api/admin/stats/route";
import { auth } from "@/auth";

vi.mock("@/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/auth")>();
  return { ...mod, auth: vi.fn() };
});

describeIntegration("security regression integration", () => {
  it("returns 401 for protected product API without session", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await productsGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: "any-id" }),
    });
    expect(response.status).toBe(401);
  });

  it("blocks IDOR on another user's product", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const product = await createTestProduct(owner.id);
    await mockAuthForUser(attacker);

    const response = await productsGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: product.id }),
    });
    expect(response.status).toBe(404);
  });

  it("blocks normal user from admin API", async () => {
    const user = await createTestUser({ role: "user" });
    await mockAuthForUser(user);

    const response = await adminStatsGet(new Request("http://localhost"));
    expect(response.status).toBe(403);
  });

  it("denies cross-user storage asset access", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const product = await createTestProduct(owner.id);
    const { canUserAccessAsset } = await import("@/lib/assets/authorization");
    expect(await canUserAccessAsset(product.originalImageKey, attacker.id)).toBe(false);
  });

  it("blocks video job creation with another user's storage key", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const product = await createTestProduct(owner.id);
    await setUserCredits(attacker.id, 200);
    await mockAuthForUser(attacker);

    const { POST: generateVideoPost } = await import("@/app/api/generate/video/route");
    const response = await generateVideoPost(
      new Request("http://localhost/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Stolen source",
          sourceType: "product",
          sourceStorageKey: product.originalImageKey,
          productId: product.id,
        }),
      }),
    );

    expect(response.status).toBe(404);
  });
});
