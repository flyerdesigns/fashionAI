"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithCredentials, signInWithGoogle } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { IconLogo } from "@/components/ui/icons";

interface LoginFormProps {
  googleAuthEnabled?: boolean;
}

export function LoginForm({ googleAuthEnabled = false }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await signInWithCredentials(formData)) ?? null;
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
          Create premium fashion imagery with AI.
        </h1>
        <p className="mt-3 text-sm text-stone-500">
          Turn your clothing photos into professional fashion campaigns.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        {googleAuthEnabled && (
          <>
            <form action={signInWithGoogle}>
              <Button type="submit" className="w-full" size="lg">
                Continue with Google
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs uppercase tracking-widest text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
          </>
        )}

        <form action={formAction} className="space-y-4">
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
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none ring-stone-900 transition focus:ring-2"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" variant="outline" className="w-full" loading={pending}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-stone-900 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
