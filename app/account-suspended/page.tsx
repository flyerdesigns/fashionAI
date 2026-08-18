import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { USER_ACCOUNT_STATUS } from "@/lib/auth/account-status";

export default async function AccountSuspendedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.status !== USER_ACCOUNT_STATUS.SUSPENDED) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium text-stone-900">Account suspended</h1>
        <p className="mt-3 text-sm text-stone-600">
          Your account has been suspended. You cannot create generations or use credits until an
          administrator restores access.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          If you believe this is a mistake, contact support or review billing if payment is
          outstanding.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href="/settings/billing" variant="outline">
            Billing
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost">
              Log out
            </Button>
          </form>
        </div>
        <p className="mt-4 text-xs text-stone-400">
          Signed in as {session.user.email}
        </p>
      </div>
    </div>
  );
}
