// Role types/labels shared by server and client components.
// Keep server-only logic in src/lib/auth.ts.

export type UserRole = "owner" | "office_staff" | "technician" | "customer";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  office_staff: "Office Staff",
  technician: "Technician",
  customer: "Customer",
};
