import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { CreateUserInput, UserRecord } from "@/types/user-record";
import { isPostgresEnabled } from "@/lib/db/config";
import { PostgresUserRepository } from "./postgres-repository";
import { UserRepositoryError } from "./errors";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserRecord>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  update(id: string, data: Partial<UserRecord>): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<UserRecord[]>;
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf-8");
  }
}

async function readUsers(): Promise<UserRecord[]> {
  await ensureDataFile();
  const raw = await fs.readFile(USERS_FILE, "utf-8");
  const users = JSON.parse(raw) as Partial<UserRecord>[];
  return users.map((user) => ({
    id: user.id!,
    name: user.name!,
    email: user.email!,
    image: user.image ?? null,
    passwordHash: user.passwordHash ?? null,
    provider: user.provider as UserRecord["provider"],
    role: user.role === "admin" ? "admin" : "user",
    status: user.status === "suspended" ? "suspended" : "active",
    createdAt: user.createdAt!,
    updatedAt: user.updatedAt!,
  }));
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export class JsonUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<UserRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new UserRepositoryError("A user with this email already exists.", "DUPLICATE_EMAIL");
    }

    const users = await readUsers();
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      name: input.name.trim(),
      email: normalizedEmail,
      image: input.image ?? null,
      passwordHash: input.passwordHash ?? null,
      provider: input.provider,
      role: input.role ?? "user",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    await writeUsers(users);
    return user;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const users = await readUsers();
    return users.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const users = await readUsers();
    const normalized = email.trim().toLowerCase();
    return users.find((u) => u.email === normalized) ?? null;
  }

  async update(id: string, data: Partial<UserRecord>): Promise<UserRecord | null> {
    const users = await readUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const updated: UserRecord = {
      ...users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    users[index] = updated;
    await writeUsers(users);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const users = await readUsers();
    const next = users.filter((u) => u.id !== id);
    if (next.length === users.length) return false;
    await writeUsers(next);
    return true;
  }

  async list(): Promise<UserRecord[]> {
    return readUsers();
  }
}

export { UserRepositoryError } from "./errors";

export const userRepository: UserRepository = isPostgresEnabled()
  ? new PostgresUserRepository()
  : new JsonUserRepository();
