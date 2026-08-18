import type { User } from "@/types";

/** Mock user — replace with auth session in Step 2+ */
export const mockUser: User = {
  id: "user_demo_001",
  name: "Alex Rivera",
  email: "alex@atelierstudio.com",
  plan: "pro",
  creditsRemaining: 847,
};

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
