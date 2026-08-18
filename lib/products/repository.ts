import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type {
  ClothingAsset,
  CreateClothingAssetInput,
  UpdateClothingAssetInput,
} from "@/types";
import { isPostgresEnabled } from "@/lib/db/config";
import { PostgresProductRepository } from "./postgres-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

export interface ProductRepository {
  findAllByUserId(userId: string): Promise<ClothingAsset[]>;
  findById(id: string): Promise<ClothingAsset | null>;
  findByIdForUser(id: string, userId: string): Promise<ClothingAsset | null>;
  create(
    asset: Omit<ClothingAsset, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<ClothingAsset>;
  update(id: string, data: UpdateClothingAssetInput): Promise<ClothingAsset | null>;
  updateForUser(
    id: string,
    userId: string,
    data: UpdateClothingAssetInput,
  ): Promise<ClothingAsset | null>;
  delete(id: string): Promise<boolean>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
  findByStorageKey(storageKey: string): Promise<ClothingAsset | null>;
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PRODUCTS_FILE);
  } catch {
    await fs.writeFile(PRODUCTS_FILE, "[]", "utf-8");
  }
}

async function readProducts(): Promise<ClothingAsset[]> {
  await ensureDataFile();
  const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
  return JSON.parse(raw) as ClothingAsset[];
}

async function writeProducts(products: ClothingAsset[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
}

export class JsonProductRepository implements ProductRepository {
  async findAllByUserId(userId: string): Promise<ClothingAsset[]> {
    const products = await readProducts();
    return products
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findById(id: string): Promise<ClothingAsset | null> {
    const products = await readProducts();
    return products.find((p) => p.id === id) ?? null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ClothingAsset | null> {
    const product = await this.findById(id);
    if (!product || product.userId !== userId) return null;
    return product;
  }

  async findByStorageKey(storageKey: string): Promise<ClothingAsset | null> {
    const products = await readProducts();
    return products.find((p) => p.storageKey === storageKey) ?? null;
  }

  async create(
    data: Omit<ClothingAsset, "id" | "createdAt" | "updatedAt">,
    options?: { id?: string },
  ): Promise<ClothingAsset> {
    const products = await readProducts();
    const now = new Date().toISOString();
    const asset: ClothingAsset = {
      ...data,
      id: options?.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    products.push(asset);
    await writeProducts(products);
    return asset;
  }

  async update(id: string, data: UpdateClothingAssetInput): Promise<ClothingAsset | null> {
    const products = await readProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updated: ClothingAsset = {
      ...products[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    products[index] = updated;
    await writeProducts(products);
    return updated;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateClothingAssetInput,
  ): Promise<ClothingAsset | null> {
    const product = await this.findByIdForUser(id, userId);
    if (!product) return null;
    return this.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const products = await readProducts();
    const next = products.filter((p) => p.id !== id);
    if (next.length === products.length) return false;
    await writeProducts(next);
    return true;
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const product = await this.findByIdForUser(id, userId);
    if (!product) return false;
    return this.delete(id);
  }
}

export const productRepository: ProductRepository = isPostgresEnabled()
  ? new PostgresProductRepository()
  : new JsonProductRepository();

export type { CreateClothingAssetInput };
