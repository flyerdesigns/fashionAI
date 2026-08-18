import { afterAll, afterEach, describe } from "vitest";
import {
  assertIntegrationTestEnvironment,
  configureIntegrationEnv,
  isIntegrationTestEnabled,
} from "@/lib/test/env-guard";
import { cleanupIntegrationTestData } from "./helpers/factories";
import { disconnectTestPrisma } from "@/lib/test/prisma-client";

configureIntegrationEnv();

if (isIntegrationTestEnabled()) {
  assertIntegrationTestEnvironment();
}

afterEach(async () => {
  if (!isIntegrationTestEnabled()) return;
  await cleanupIntegrationTestData();
});

afterAll(async () => {
  await disconnectTestPrisma();
});

export function describeIntegration(name: string, fn: () => void): void {
  if (isIntegrationTestEnabled()) {
    describe(name, fn);
  } else {
    describe.skip(`${name} (DATABASE_URL_TEST not set)`, fn);
  }
}
