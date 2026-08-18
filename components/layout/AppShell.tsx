"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { User } from "@/types";

interface AppShellProps {
  user: User;
  children: React.ReactNode;
  headerTitle?: string;
  headerActions?: React.ReactNode;
}

export function AppShell({
  user,
  children,
  headerTitle,
  headerActions,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={headerTitle}
          onMenuClick={() => setSidebarOpen(true)}
          actions={headerActions}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
