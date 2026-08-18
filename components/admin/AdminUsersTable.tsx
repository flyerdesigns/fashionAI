"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AdminUserListItem } from "@/lib/admin/users";

interface AdminUsersTableProps {
  initialUsers: AdminUserListItem[];
}

export function AdminUsersTable({ initialUsers }: AdminUsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleRole(user: AdminUserListItem) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to update role.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: data.role } : u)),
      );
      setMessage(`Updated ${user.email} to ${data.role}.`);
    } catch {
      setMessage("Failed to update role.");
    } finally {
      setLoading(false);
    }
  }

  async function adjustCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    const parsedAmount = Number.parseInt(amount, 10);
    if (!Number.isInteger(parsedAmount) || parsedAmount === 0) {
      setMessage("Enter a non-zero integer amount.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          amount: parsedAmount,
          reason: reason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to adjust credits.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserId
            ? { ...u, creditBalance: data.newBalance }
            : u,
        ),
      );
      setAmount("");
      setReason("");
      setSelectedUserId(null);
      setMessage(`Credits adjusted. New balance: ${data.newBalance}.`);
    } catch {
      setMessage("Failed to adjust credits.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          {message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-100 bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Credits</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-stone-50 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-stone-900">{user.name}</p>
                  <p className="text-xs text-stone-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.role === "admin" ? "default" : "muted"}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {user.creditBalance ?? "—"}
                  {user.creditReserved ? (
                    <span className="ml-1 text-xs text-stone-400">
                      ({user.creditReserved} reserved)
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => toggleRole(user)}
                    >
                      {user.role === "admin" ? "Demote" : "Promote"}
                    </Button>
                    <Button href={`/admin/users/${user.id}`} size="sm" variant="ghost">
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      Adjust credits
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <form
          onSubmit={adjustCredits}
          className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4"
        >
          <h3 className="font-medium text-stone-900">Adjust credits</h3>
          <p className="text-sm text-stone-500">
            User: {users.find((u) => u.id === selectedUserId)?.email}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-stone-600">Amount (+ grant, − deduct)</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-stone-600">Reason</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                minLength={3}
                maxLength={500}
                required
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              Apply adjustment
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedUserId(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
