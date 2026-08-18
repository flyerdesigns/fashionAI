import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
