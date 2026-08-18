import { test, expect } from "@playwright/test";

const SECRET_LEAK_PATTERN =
  /sk_live_|sk_test_[a-zA-Z0-9]+|whsec_[a-zA-Z0-9]+|GEMINI_API_KEY|AWS_SECRET_ACCESS_KEY|AUTH_SECRET=[^\s"]+/i;

test.describe("health endpoints", () => {
  test("GET /api/health returns JSON without secrets", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());

    const body = await response.text();
    expect(body).not.toMatch(SECRET_LEAK_PATTERN);
    expect(body.length).toBeGreaterThan(0);
  });

  test("GET /api/health/live returns alive status", async ({ request }) => {
    const response = await request.get("/api/health/live");
    expect(response.status()).toBe(200);
    const json = (await response.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });

  test("GET /api/health/ready returns readiness payload", async ({ request }) => {
    const response = await request.get("/api/health/ready");
    expect([200, 503]).toContain(response.status());

    const json = (await response.json()) as { status?: string; services?: Record<string, string> };
    expect(json.status).toBeDefined();
    expect(json.services).toBeDefined();

    const serialized = JSON.stringify(json);
    expect(serialized).not.toMatch(SECRET_LEAK_PATTERN);
  });
});
