"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AdminJobType } from "@/lib/admin/jobs";

interface AdminJobActionsProps {
  jobId: string;
  jobType: AdminJobType;
  status: string;
}

export function AdminJobActions({ jobId, jobType, status }: AdminJobActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: jobType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Retry failed.");
        return;
      }
      setMessage(`Retry queued. New job: ${data.jobId ?? data.jobId}`);
    } catch {
      setMessage("Retry failed.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: jobType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Cancel failed.");
        return;
      }
      setMessage(`Job cancelled. Status: ${data.status}`);
    } catch {
      setMessage("Cancel failed.");
    } finally {
      setLoading(false);
    }
  }

  const canRetry = status === "failed" || status === "partially_failed" || status === "cancelled";
  const canCancel = status === "queued" || status === "processing";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canRetry && (
          <Button disabled={loading} onClick={retry}>
            Retry job
          </Button>
        )}
        {canCancel && (
          <Button disabled={loading} variant="outline" onClick={cancel}>
            Cancel job
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-stone-600">{message}</p>}
    </div>
  );
}
