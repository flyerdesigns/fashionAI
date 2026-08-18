import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { GenerationJob } from "@/types/generation-job";
import { isPostgresEnabled } from "@/lib/db/config";
import { PostgresGenerationJobRepository } from "./postgres-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const JOBS_FILE = path.join(DATA_DIR, "generation-jobs.json");
const IDEMPOTENCY_FILE = path.join(DATA_DIR, "generation-idempotency.json");

export interface IdempotencyRecord {
  requestId: string;
  jobId: string;
  createdAt: string;
}

export interface GenerationJobRepository {
  create(
    data: Omit<GenerationJob, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<GenerationJob>;
  findById(id: string): Promise<GenerationJob | null>;
  findByIdForUser(id: string, userId: string): Promise<GenerationJob | null>;
  findByPhotoshootId(photoshootId: string): Promise<GenerationJob | null>;
  findAllByPhotoshootId(photoshootId: string): Promise<GenerationJob[]>;
  update(id: string, data: Partial<GenerationJob>): Promise<GenerationJob | null>;
  list(): Promise<GenerationJob[]>;
  delete(id: string): Promise<boolean>;
  findActiveByRequestId(requestId: string): Promise<GenerationJob | null>;
  saveIdempotency(record: IdempotencyRecord): Promise<void>;
  claimNextJob(workerId: string): Promise<GenerationJob | null>;
}

async function ensureDataFile(filePath: string, defaultContent: string): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent, "utf-8");
  }
}

async function readJobs(): Promise<GenerationJob[]> {
  await ensureDataFile(JOBS_FILE, "[]");
  const raw = await fs.readFile(JOBS_FILE, "utf-8");
  return JSON.parse(raw) as GenerationJob[];
}

async function writeJobs(jobs: GenerationJob[]): Promise<void> {
  await ensureDataFile(JOBS_FILE, "[]");
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
}

async function readIdempotency(): Promise<IdempotencyRecord[]> {
  await ensureDataFile(IDEMPOTENCY_FILE, "[]");
  const raw = await fs.readFile(IDEMPOTENCY_FILE, "utf-8");
  return JSON.parse(raw) as IdempotencyRecord[];
}

async function writeIdempotency(records: IdempotencyRecord[]): Promise<void> {
  await ensureDataFile(IDEMPOTENCY_FILE, "[]");
  await fs.writeFile(IDEMPOTENCY_FILE, JSON.stringify(records, null, 2), "utf-8");
}

const ACTIVE_JOB_STATUSES = new Set(["queued", "processing"]);

export class JsonGenerationJobRepository implements GenerationJobRepository {
  async create(
    data: Omit<GenerationJob, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<GenerationJob> {
    const jobs = await readJobs();
    const now = new Date().toISOString();
    const job: GenerationJob = {
      ...data,
      id: options?.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    jobs.push(job);
    await writeJobs(jobs);
    return job;
  }

  async findById(id: string): Promise<GenerationJob | null> {
    const jobs = await readJobs();
    return jobs.find((j) => j.id === id) ?? null;
  }

  async findByIdForUser(id: string, userId: string): Promise<GenerationJob | null> {
    const job = await this.findById(id);
    if (!job || job.userId !== userId) return null;
    return job;
  }

  async findAllByPhotoshootId(photoshootId: string): Promise<GenerationJob[]> {
    const jobs = await readJobs();
    return jobs
      .filter((j) => j.photoshootId === photoshootId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findByPhotoshootId(photoshootId: string): Promise<GenerationJob | null> {
    const jobs = await readJobs();
    return (
      jobs
        .filter((j) => j.photoshootId === photoshootId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    );
  }

  async update(id: string, data: Partial<GenerationJob>): Promise<GenerationJob | null> {
    const jobs = await readJobs();
    const index = jobs.findIndex((j) => j.id === id);
    if (index === -1) return null;

    const updated: GenerationJob = {
      ...jobs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    jobs[index] = updated;
    await writeJobs(jobs);
    return updated;
  }

  async list(): Promise<GenerationJob[]> {
    const jobs = await readJobs();
    return jobs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async delete(id: string): Promise<boolean> {
    const jobs = await readJobs();
    const next = jobs.filter((j) => j.id !== id);
    if (next.length === jobs.length) return false;
    await writeJobs(next);
    return true;
  }

  async findActiveByRequestId(requestId: string): Promise<GenerationJob | null> {
    const records = await readIdempotency();
    const match = records.find((r) => r.requestId === requestId);
    if (!match) return null;

    const job = await this.findById(match.jobId);
    if (!job || !ACTIVE_JOB_STATUSES.has(job.status)) return null;
    return job;
  }

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    const records = await readIdempotency();
    const filtered = records.filter((r) => r.requestId !== record.requestId);
    filtered.push(record);
    await writeIdempotency(filtered);
  }

  async claimNextJob(workerId: string): Promise<GenerationJob | null> {
    const jobs = await readJobs();
    const candidate =
      jobs.find((j) => j.status === "queued") ??
      jobs.find(
        (j) =>
          j.status === "processing" &&
          !j.images.some((img) => img.status === "generating"),
      );

    if (!candidate) return null;

    return (
      (await this.update(candidate.id, {
        status: "processing",
        startedAt: candidate.startedAt ?? new Date().toISOString(),
      })) ?? null
    );
  }
}

export const generationJobRepository: GenerationJobRepository = isPostgresEnabled()
  ? new PostgresGenerationJobRepository()
  : new JsonGenerationJobRepository();
