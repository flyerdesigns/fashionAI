"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface AdminUserStatusActionsProps {
  userId: string;
  currentStatus: string;
}

export function AdminUserStatusActions({ userId, currentStatus }: AdminUserStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState(currentStatus);

  async function toggleStatus() {
    const nextStatus = status === "suspended" ? "active" : "suspended";
    const confirmed = window.confirm(
      nextStatus === "suspended"
        ? "Suspend this user? They will lose access to generation and most app features."
        : "Unsuspend this user and restore access?",
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Status update failed.");
        return;
      }
      setStatus(data.status);
      setMessage(`Account status updated to ${data.status}.`);
    } catch {
      setMessage("Status update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-medium text-stone-900">Account status</h3>
      <p className="mt-1 text-sm text-stone-500">
        Current status:{" "}
        <span className="font-medium capitalize text-stone-900">{status}</span>
      </p>
      <Button
        className="mt-3"
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={toggleStatus}
      >
        {status === "suspended" ? "Unsuspend user" : "Suspend user"}
      </Button>
      {message && <p className="mt-2 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
