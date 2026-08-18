/** @deprecated Import from `@/lib/admin` instead */
export { getAdminDashboardStats, getAdminStats } from "./stats";
export { listAdminUsers, getAdminUserDetail, updateUserRole, updateUserStatus } from "./users";
export {
  listAdminJobs,
  getAdminJobDetail,
  adminRetryJob,
  adminCancelJob,
} from "./jobs";
export { listAdminPhotoshoots, getAdminPhotoshootDetail } from "./photoshoots";
export { listAdminVideos, getAdminVideoDetail } from "./videos";
export { listAdminSubscriptions } from "./subscriptions";
export { getWorkerHealthReport as getWorkerHeartbeats } from "@/lib/workers/heartbeat";

export type { AdminUserListItem as AdminUserView } from "./users";
export type { AdminJobListItem as AdminJobView } from "./jobs";
