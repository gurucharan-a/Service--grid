import type { AppUser, Role } from "@/types";

// Demo auth: pick a persona. Next.js deploy uses NextAuth credentials+JWT (see README).
export const DEMO_USERS: (AppUser & { label: string })[] = [
  { id: "u-cust", name: "Priya Customer", email: "customer@grid.io", role: "CUSTOMER", siteId: "site-a", password: "demo", label: "Customer — creates requests" },
  { id: "u-ops", name: "Omar Ops", email: "ops@grid.io", role: "OPS_MANAGER", password: "demo", label: "Ops Manager — approves & assigns" },
  { id: "u-tech", name: "Tara Tech", email: "tech@grid.io", role: "TECHNICIAN", password: "demo", label: "Technician — field PWA" },
  { id: "u-admin", name: "Ada Admin", email: "admin@grid.io", role: "ADMIN", password: "demo", label: "Admin — users/inventory" },
];

export function roleColor(role: Role) {
  return { CUSTOMER: "bg-sky-100 text-sky-800", OPS_MANAGER: "bg-violet-100 text-violet-800", TECHNICIAN: "bg-emerald-100 text-emerald-800", ADMIN: "bg-amber-100 text-amber-800" }[role];
}
