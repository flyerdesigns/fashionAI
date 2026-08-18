import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "muted";
  className?: string;
}

const variantStyles = {
  default: "bg-stone-100 text-stone-700",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  muted: "bg-stone-50 text-stone-500 ring-stone-100",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Shown on demo/mock data sections until real data is wired up */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="muted" className={className}>
      Demo data
    </Badge>
  );
}
