import { requireAdminUser } from "@/lib/admin/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminUser();

  return (
    <DashboardLayout headerTitle="Admin">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminNav />
        {children}
      </div>
    </DashboardLayout>
  );
}
