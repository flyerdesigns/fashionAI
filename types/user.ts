export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "free" | "starter" | "pro" | "business" | "enterprise";
}

export interface User extends UserProfile {
  creditsRemaining: number;
  role?: "user" | "admin";
  status?: "active" | "suspended";
}
