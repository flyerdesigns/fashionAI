"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface AdminUserRoleActionsProps {
  userId: string;
  currentRole: string;
}

export function AdminUserRoleActions({ userId, currentRole }: AdminUserRoleActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState(currentRole);

  async function toggleRole() {
    const nextRole = role === "admin" ? "user" : "admin";
    const confirmed = window.confirm(
      `Change role from ${role} to ${nextRole}? This action is audited.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Role update failed.");
        return;
      }
      setRole(data.role);
      setMessage(`Role updated to ${data.role}.`);
    } catch {
      setMessage("Role update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-medium text-stone-900">Role management</h3>
      <p className="mt-1 text-sm text-stone-500">Current role: {role}</p>
      <Button className="mt-3" size="sm" variant="outline" disabled={loading} onClick={toggleRole}>
        {role === "admin" ? "Demote to user" : "Promote to admin"}
      </Button>
      {message && <p className="mt-2 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
