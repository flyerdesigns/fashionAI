"use client";

import Link from "next/link";
import { IconCoins } from "@/components/ui/icons";

interface CreditBalanceBadgeProps {
  available: number;
}

export function CreditBalanceBadge({ available }: CreditBalanceBadgeProps) {
  return (
    <Link
      href="/credits"
      className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
    >
      <IconCoins className="h-4 w-4 text-amber-600" />
      <span>{available.toLocaleString()} Credits</span>
    </Link>
  );
}
