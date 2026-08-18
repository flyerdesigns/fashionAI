"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type CreditAction = "grant" | "deduct" | "refund";

export function AdminCreditsPanel() {
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<CreditAction>("grant");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(amount, 10);
    if (!targetUserId.trim() || !Number.isInteger(parsed) || parsed <= 0) {
      setMessage("Enter a valid user ID and positive amount.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/credits/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetUserId.trim(),
          amount: parsed,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Operation failed.");
        return;
      }
      setMessage(`Success. New balance: ${data.newBalance}`);
      setAmount("");
      setReason("");
    } catch {
      setMessage("Operation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <label className="block text-sm">
        <span className="text-stone-600">Action</span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as CreditAction)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
        >
          <option value="grant">Grant credits</option>
          <option value="deduct">Deduct credits</option>
          <option value="refund">Refund credits</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Target user ID</span>
        <input
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-xs"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Amount</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Reason</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          minLength={3}
          maxLength={500}
          required
        />
      </label>
      <Button type="submit" disabled={loading}>
        Submit {action}
      </Button>
      {message && <p className="text-sm text-stone-600">{message}</p>}
    </form>
  );
}
