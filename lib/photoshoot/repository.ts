import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { PhotoshootConfiguration } from "@/types/photoshoot-config";
import type { PhotoshootStatus } from "@/types/photoshoot";
import type { GeneratedImageAsset, PhotoshootRecord } from "@/lib/ai/generation-orchestrator";
import { isPostgresEnabled } from "@/lib/db/config";
import { PostgresPhotoshootRepository } from "./postgres-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const PHOTOSHOOTS_FILE = path.join(DATA_DIR, "photoshoots.json");

export interface PhotoshootRepository {
  findAllByUserId(userId: string): Promise<PhotoshootRecord[]>;
  findById(id: string): Promise<PhotoshootRecord | null>;
  findByIdForUser(id: string, userId: string): Promise<PhotoshootRecord | null>;
  create(data: Omit<PhotoshootRecord, "id" | "createdAt" | "updatedAt">): Promise<PhotoshootRecord>;
  update(id: string, data: Partial<PhotoshootRecord>): Promise<PhotoshootRecord | null>;
  updateForUser(
    id: string,
    userId: string,
    data: Partial<PhotoshootRecord>,
  ): Promise<PhotoshootRecord | null>;
  delete(id: string): Promise<boolean>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
  findByImageStorageKey(storageKey: string): Promise<PhotoshootRecord | null>;
  hasPhotoshootsForProduct?(productId: string): Promise<boolean>;
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PHOTOSHOOTS_FILE);
  } catch {
    await fs.writeFile(PHOTOSHOOTS_FILE, "[]", "utf-8");
  }
}

async function readPhotoshoots(): Promise<PhotoshootRecord[]> {
  await ensureDataFile();
  const raw = await fs.readFile(PHOTOSHOOTS_FILE, "utf-8");
  return JSON.parse(raw) as PhotoshootRecord[];
}

async function writePhotoshoots(records: PhotoshootRecord[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(PHOTOSHOOTS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export class JsonPhotoshootRepository implements PhotoshootRepository {
  async findAllByUserId(userId: string): Promise<PhotoshootRecord[]> {
    const records = await readPhotoshoots();
    return records
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findById(id: string): Promise<PhotoshootRecord | null> {
    const records = await readPhotoshoots();
    return records.find((r) => r.id === id) ?? null;
  }

  async findByIdForUser(id: string, userId: string): Promise<PhotoshootRecord | null> {
    const record = await this.findById(id);
    if (!record || record.userId !== userId) return null;
    return record;
  }

  async findByImageStorageKey(storageKey: string): Promise<PhotoshootRecord | null> {
    const records = await readPhotoshoots();
    return (
      records.find((record) =>
        record.images.some((image) => image.storageKey === storageKey),
      ) ?? null
    );
  }

  async hasPhotoshootsForProduct(productId: string): Promise<boolean> {
    const records = await readPhotoshoots();
    return records.some((record) => record.productId === productId);
  }

  async create(
    data: Omit<PhotoshootRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<PhotoshootRecord> {
    const records = await readPhotoshoots();
    const now = new Date().toISOString();
    const record: PhotoshootRecord = {
      ...data,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    records.push(record);
    await writePhotoshoots(records);
    return record;
  }

  async update(id: string, data: Partial<PhotoshootRecord>): Promise<PhotoshootRecord | null> {
    const records = await readPhotoshoots();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: PhotoshootRecord = {
      ...records[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    records[index] = updated;
    await writePhotoshoots(records);
    return updated;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: Partial<PhotoshootRecord>,
  ): Promise<PhotoshootRecord | null> {
    const record = await this.findByIdForUser(id, userId);
    if (!record) return null;
    return this.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const records = await readPhotoshoots();
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    await writePhotoshoots(next);
    return true;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const record = await this.findByIdForUser(id, userId);
    if (!record) return false;
    return this.delete(id);
  }
}

export const photoshootRepository: PhotoshootRepository = isPostgresEnabled()
  ? new PostgresPhotoshootRepository()
  : new JsonPhotoshootRepository();

export type { PhotoshootConfiguration, GeneratedImageAsset, PhotoshootRecord, PhotoshootStatus };
