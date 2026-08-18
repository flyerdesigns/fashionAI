import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { userRepository } from "@/lib/users/repository";
import { logoutAction } from "@/lib/auth/actions";
import { formatDate } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await requireUser();
  const record = await userRepository.findById(user.id);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile and account preferences."
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Profile</h2>
          <div className="mt-6 flex items-center gap-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-stone-100"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-xl font-medium text-stone-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-medium text-stone-900">{user.name}</p>
              <p className="text-sm text-stone-500">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Created</dt>
              <dd className="font-medium text-stone-900">
                {record ? formatDate(record.createdAt) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Plan</dt>
              <dd className="font-medium capitalize text-stone-900">{user.plan}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Billing</h2>
          <p className="mt-2 text-sm text-stone-500">
            View your plan, credit balance, and manage your subscription.
          </p>
          <Button className="mt-4" variant="outline" href="/settings/billing">
            Open Billing
          </Button>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Authentication</h2>
          <p className="mt-2 text-sm text-stone-500">
            Connected provider:{" "}
            <span className="font-medium capitalize text-stone-900">
              {record?.provider ?? "—"}
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-medium text-stone-900">Actions</h2>
          <form action={logoutAction} className="mt-4">
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
