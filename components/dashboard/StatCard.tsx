import { cn, formatNumber } from "@/lib/utils";
import { DemoBadge } from "@/components/ui/Badge";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  isMock?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  suffix,
  isMock,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        {isMock && <DemoBadge />}
      </div>
      <p className="mt-3 font-display text-3xl font-medium tracking-tight text-stone-900">
        {formatNumber(value)}
        {suffix && (
          <span className="ml-1 text-lg font-normal text-stone-400">{suffix}</span>
        )}
      </p>
    </div>
  );
}
