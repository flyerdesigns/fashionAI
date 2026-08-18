import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "./AppShell";

interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  headerActions?: ReactNode;
}

export async function DashboardLayout({
  children,
  headerTitle,
  headerActions,
}: DashboardLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user} headerTitle={headerTitle} headerActions={headerActions}>
      {children}
    </AppShell>
  );
}
