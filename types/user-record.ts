export type AuthProvider = "google" | "credentials";
export type UserRole = "user" | "admin";
export type UserAccountStatus = "active" | "suspended";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  image: string | null;
  passwordHash: string | null;
  provider: AuthProvider;
  role: UserRole;
  status: UserAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  image?: string | null;
  passwordHash?: string | null;
  provider: AuthProvider;
  role?: UserRole;
}
