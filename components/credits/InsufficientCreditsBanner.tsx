"use client";

import { Button } from "@/components/ui/Button";

interface InsufficientCreditsBannerProps {
  required: number;
  available: number;
}

export function InsufficientCreditsBanner({
  required,
  available,
}: InsufficientCreditsBannerProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
      <p className="text-sm font-medium text-amber-900">Not enough credits</p>
      <p className="mt-1 text-sm text-amber-800">
        You need {required} credits to generate this photoshoot, but you only have {available}.
      </p>
      <Button className="mt-4" size="sm" href="/settings/billing">
        Get Credits
      </Button>
    </div>
  );
}
