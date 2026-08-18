import { spawnSync } from "node:child_process";
import {
  assertIntegrationTestEnvironment,
  configureIntegrationEnv,
} from "../lib/test/env-guard";

configureIntegrationEnv();
assertIntegrationTestEnvironment();

const result = spawnSync(
  "npx",
  ["vitest", "run", "--project", "integration"],
  { stdio: "inherit", shell: true, env: process.env },
);

process.exit(result.status ?? 1);
