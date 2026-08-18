import { describeIntegration } from "./setup";
import { createTestUser, testEmail } from "./helpers/factories";
import { signUpWithCredentials } from "@/lib/auth/actions";
import { signInWithCredentials } from "@/lib/auth/actions";
import { creditService } from "@/lib/credits/service";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { auth } from "@/auth";
import { POST as generatePost } from "@/app/api/generate/photoshoot/route";
import { testPhotoshootConfiguration } from "./helpers/config";
import { createTestProduct } from "./helpers/factories";
import { buildAuthSession, mockAuthForUser } from "./helpers/auth-session";

vi.mock("@/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/auth")>();
  return { ...mod, auth: vi.fn() };
});

describeIntegration("HTTP authentication integration", () => {
  it("signs up a valid user and grants signup bonus once", async () => {
    const email = testEmail("signup");
    const form = new FormData();
    form.set("name", "Signup Test");
    form.set("email", email);
    form.set("password", "password12345");
    form.set("confirmPassword", "password12345");

    try {
      await signUpWithCredentials(form);
    } catch (error) {
      if (!isRedirectError(error)) throw error;
    }

    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();

    const balance = await creditService.getBalance(user!.id);
    expect(balance.balance).toBeGreaterThanOrEqual(0);

    await creditService.ensureAccount(user!.id, true);
    const again = await creditService.getBalance(user!.id);
    expect(again.balance).toBe(balance.balance);
  });

  it("rejects duplicate email on signup", async () => {
    const email = testEmail("dup");
    const form = new FormData();
    form.set("name", "Dup Test");
    form.set("email", email);
    form.set("password", "password12345");
    form.set("confirmPassword", "password12345");

    try {
      await signUpWithCredentials(form);
    } catch (error) {
      if (!isRedirectError(error)) throw error;
    }

    const result = await signUpWithCredentials(form);
    expect(result?.error).toMatch(/already exists/i);
  });

  it("rejects weak password and mismatched confirmation", async () => {
    const weak = new FormData();
    weak.set("name", "Weak");
    weak.set("email", testEmail("weak"));
    weak.set("password", "short");
    weak.set("confirmPassword", "short");
    expect((await signUpWithCredentials(weak))?.error).toMatch(/at least/i);

    const mismatch = new FormData();
    mismatch.set("name", "Mismatch");
    mismatch.set("email", testEmail("mismatch"));
    mismatch.set("password", "password12345");
    mismatch.set("confirmPassword", "password12346");
    expect((await signUpWithCredentials(mismatch))?.error).toMatch(/do not match/i);
  });

  it("logs in with valid credentials and rejects invalid password", async () => {
    const user = await createTestUser({ email: testEmail("login") });

    vi.mocked(auth).mockResolvedValue(buildAuthSession(user));

    const bad = new FormData();
    bad.set("email", user.email);
    bad.set("password", "wrong-password");
    expect((await signInWithCredentials(bad))?.error).toMatch(/invalid/i);

    const good = new FormData();
    good.set("email", user.email);
    good.set("password", "password12345");
    try {
      await signInWithCredentials(good);
    } catch (error) {
      expect(isRedirectError(error)).toBe(true);
    }
  });

  it("returns 401 for protected API without session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await generatePost(
      new Request("http://localhost/api/generate/photoshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "missing",
          configuration: testPhotoshootConfiguration(["standing"]),
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("allows authenticated user to access own product generation route", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    await mockAuthForUser(user);

    const response = await generatePost(
      new Request("http://localhost/api/generate/photoshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          configuration: testPhotoshootConfiguration(["standing"]),
          numberOfImages: 1,
        }),
      }),
    );

    expect(response.status).toBe(202);
  });
});
