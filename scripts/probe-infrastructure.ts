/**
 * Probe available staging infrastructure — never prints secrets.
 *
 * Usage: npm run probe:infrastructure
 */
import { spawnSync } from "node:child_process";
import net from "node:net";

type Status = "AVAILABLE" | "UNAVAILABLE" | "BROKEN";

interface ProbeRow {
  name: string;
  status: Status;
  detail?: string;
}

function probePort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function probeCommand(command: string, args: string[]): Status {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status === 0) return "AVAILABLE";
  if (result.error?.message.includes("ENOENT")) return "UNAVAILABLE";
  return "BROKEN";
}

async function main() {
  console.log("Atelier AI — Infrastructure Probe\n");

  const rows: ProbeRow[] = [];

  const dockerStatus = probeCommand("docker", ["--version"]);
  rows.push({
    name: "Docker CLI",
    status: dockerStatus,
    detail:
      dockerStatus === "BROKEN"
        ? "docker symlink may be broken (Docker Desktop uninstalled?)"
        : undefined,
  });

  if (dockerStatus === "AVAILABLE") {
    const composeStatus = probeCommand("docker", ["compose", "version"]);
    rows.push({ name: "Docker Compose", status: composeStatus });
  } else {
    rows.push({
      name: "Docker Compose",
      status: "UNAVAILABLE",
      detail: "requires Docker CLI",
    });
  }

  rows.push({
    name: "psql CLI",
    status: probeCommand("psql", ["--version"]),
  });

  rows.push({
    name: "redis-cli",
    status: probeCommand("redis-cli", ["--version"]),
  });

  rows.push({
    name: "GitHub CLI (gh)",
    status: probeCommand("gh", ["--version"]),
  });

  const postgresPort = await probePort("127.0.0.1", 5432);
  rows.push({
    name: "PostgreSQL (localhost:5432)",
    status: postgresPort ? "AVAILABLE" : "UNAVAILABLE",
  });

  const redisPort = await probePort("127.0.0.1", 6379);
  rows.push({
    name: "Redis (localhost:6379)",
    status: redisPort ? "AVAILABLE" : "UNAVAILABLE",
  });

  const appPort = await probePort("127.0.0.1", 3000);
  rows.push({
    name: "Application (localhost:3000)",
    status: appPort ? "AVAILABLE" : "UNAVAILABLE",
  });

  for (const row of rows) {
    const detail = row.detail ? ` — ${row.detail}` : "";
    console.log(`${row.name}: ${row.status}${detail}`);
  }

  const hasDb = postgresPort;
  const hasRedis = redisPort;
  const hasDocker = dockerStatus === "AVAILABLE";

  console.log("\nRecommended path:");
  if (hasDb && hasRedis) {
    console.log("  → Configure .env.staging and run npm run certify:staging");
  } else if (hasDocker) {
    console.log("  → docker compose -f docker-compose.staging.yml up -d");
    console.log("  → Configure .env.staging and run npm run certify:staging");
  } else {
    console.log("  → Local Docker/PostgreSQL/Redis unavailable");
    console.log("  → Use GitHub Actions: workflow staging-certification.yml (workflow_dispatch)");
    console.log("  → Or provision managed staging (Postgres + Redis + S3 + Stripe TEST + Gemini)");
  }

  if (!hasDb || !hasRedis) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
