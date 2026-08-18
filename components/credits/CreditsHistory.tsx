"use client";

import type { UsageRecordView } from "@/lib/credits";
import { formatDate } from "@/lib/utils";

interface CreditsHistoryProps {
  initialUsage: UsageRecordView[];
}

function formatOperation(operation: string): string {
  switch (operation) {
    case "photoshoot_image":
      return "AI Photoshoot";
    case "regenerate_image":
      return "Image Regeneration";
    case "retry_failed_image":
      return "Retry Failed Image";
    default:
      return operation.replace(/_/g, " ");
  }
}

export function CreditsHistory({ initialUsage }: CreditsHistoryProps) {
  if (initialUsage.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
        No usage history yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-6 py-4">
        <h2 className="font-display text-lg font-medium text-stone-900">Usage History</h2>
      </div>
      <ul className="divide-y divide-stone-100">
        {initialUsage.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-sm">
            <div>
              <p className="font-medium text-stone-900">{formatOperation(item.operation)}</p>
              <p className="text-stone-500">{formatDate(item.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-stone-900">
                {item.status === "refunded" ? "+" : "-"}
                {item.credits} credits
              </p>
              <p className="capitalize text-stone-500">{item.status}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
