import { prisma } from "@/lib/db/client";
import type { CreateUserInput, UserRecord } from "@/types/user-record";
import { mapCreateUserInput, mapUser } from "@/lib/db/mappers";
import { UserRepositoryError } from "./errors";
import type { UserRepository } from "./repository";

export class PostgresUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const record = await prisma.user.create({
        data: mapCreateUserInput(input),
      });
      return mapUser(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new UserRepositoryError(
          "A user with this email already exists.",
          "DUPLICATE_EMAIL",
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<UserRecord | null> {
    const record = await prisma.user.findUnique({ where: { id } });
    return record ? mapUser(record) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const record = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return record ? mapUser(record) : null;
  }

  async update(id: string, data: Partial<UserRecord>): Promise<UserRecord | null> {
    try {
      const record = await prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined
            ? { email: data.email.trim().toLowerCase() }
            : {}),
          ...(data.image !== undefined ? { image: data.image } : {}),
          ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
          ...(data.provider !== undefined ? { provider: data.provider } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });
      return mapUser(record);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<UserRecord[]> {
    const records = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return records.map(mapUser);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
