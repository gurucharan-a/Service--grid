import type { RequestStatus } from "@/types";

// Server-side state machine. Illegal transitions rejected (throws).
const ALLOWED: Record<RequestStatus, RequestStatus[]> = {
  CREATED: ["VALIDATED", "EXCEPTION"],
  VALIDATED: ["PENDING_APPROVAL", "EXCEPTION"],
  PENDING_APPROVAL: ["APPROVED", "EXCEPTION"],
  APPROVED: ["ASSIGNED", "EXCEPTION"],
  ASSIGNED: ["IN_PROGRESS", "EXCEPTION"],
  IN_PROGRESS: ["PENDING_VERIFICATION", "EXCEPTION"],
  PENDING_VERIFICATION: ["CLOSED", "EXCEPTION", "IN_PROGRESS"],
  EXCEPTION: ["APPROVED", "ASSIGNED", "IN_PROGRESS", "PENDING_APPROVAL"],
  CLOSED: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return (ALLOWED[from] ?? []).includes(to);
}
export function assertTransition(from: RequestStatus, to: RequestStatus) {
  if (!canTransition(from, to)) throw new Error(`Illegal transition ${from} -> ${to}`);
}

// RBAC matrix — mirrored in Next.js middleware (see README).
export const RBAC: Record<string, string[]> = {
  "request:create": ["CUSTOMER", "OPS_MANAGER", "ADMIN"],
  "request:approve": ["OPS_MANAGER", "ADMIN"],
  "request:assign": ["OPS_MANAGER", "ADMIN"],
  "request:accept": ["TECHNICIAN"],
  "request:status": ["TECHNICIAN", "OPS_MANAGER", "ADMIN"],
  "request:verify": ["OPS_MANAGER", "ADMIN"],
  "inventory:manage": ["ADMIN", "OPS_MANAGER"],
  "users:manage": ["ADMIN"],
  "demo:controls": ["OPS_MANAGER", "ADMIN"],
};
export function can(role: string, action: string) {
  return (RBAC[action] ?? []).includes(role);
}
