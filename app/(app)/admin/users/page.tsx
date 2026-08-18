import { listAdminUsers } from "@/lib/admin/users";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export default async function AdminUsersPage() {
  const { items } = await listAdminUsers({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-stone-900">Users</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage user roles and credit balances.
        </p>
      </div>
      <AdminUsersTable initialUsers={items} />
    </div>
  );
}
