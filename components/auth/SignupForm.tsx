"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithCredentials } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { IconLogo } from "@/components/ui/icons";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await signUpWithCredentials(formData)) ?? null;
    },
    null,
  );

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white">
          <IconLogo className="h-7 w-7" />
        </div>
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          Atelier AI
        </p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-stone-900">
          Create your account
        </h1>
        <p className="mt-3 text-sm text-stone-500">
          Start creating professional AI fashion photoshoots.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none ring-stone-900 transition focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none ring-stone-900 transition focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none ring-stone-900 transition focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none ring-stone-900 transition focus:ring-2"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={pending}>
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-stone-900 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
