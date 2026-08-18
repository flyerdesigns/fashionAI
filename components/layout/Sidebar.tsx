"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconCamera,
  IconChevronRight,
  IconClose,
  IconCoins,
  IconDashboard,
  IconLayout,
  IconLogo,
  IconSettings,
  IconShirt,
  IconSparkles,
  IconUser,
  IconVideo,
} from "@/components/ui/icons";
import type { User } from "@/types";
import { logoutAction } from "@/lib/auth/actions";
import { CreditBalanceBadge } from "@/components/credits/CreditBalanceBadge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: IconDashboard },
  { label: "Create Photoshoot", href: "/create", icon: IconSparkles },
  { label: "My Products", href: "/products", icon: IconShirt },
  { label: "Photoshoots", href: "/photoshoots", icon: IconCamera },
  { label: "Videos", href: "/videos", icon: IconVideo },
  { label: "Templates", href: "/templates", icon: IconLayout },
  { label: "Credits", href: "/credits", icon: IconCoins },
  { label: "Settings", href: "/settings", icon: IconSettings },
];

const adminNavItem: NavItem = {
  label: "Admin",
  href: "/admin",
  icon: IconDashboard,
};

interface SidebarProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-stone-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white">
          <IconLogo className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-base font-semibold tracking-tight text-stone-900">
            Atelier AI
          </p>
          <p className="text-[11px] uppercase tracking-widest text-stone-400">
            Fashion Studio
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 lg:hidden"
          aria-label="Close sidebar"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <div className="mb-4 px-1">
          <CreditBalanceBadge available={user.creditsRemaining} />
        </div>
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <IconChevronRight className="ml-auto h-4 w-4 opacity-60" />
              )}
            </Link>
          );
        })}
        {user.role === "admin" && (() => {
          const item = adminNavItem;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-amber-900 text-white"
                  : "text-amber-800 hover:bg-amber-50 hover:text-amber-950",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })()}
      </nav>

      <div className="border-t border-stone-100 p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100 transition hover:bg-stone-100"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600">
              <IconUser className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
          </div>
        </Link>
        <form action={logoutAction} className="mt-2">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            Log out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
