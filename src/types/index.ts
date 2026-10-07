// ServiceGrid domain model — mirrors prisma/schema.prisma (Postgres) 1:1.
// In-browser runtime uses this + services/store.ts (localStorage persisted).
// Next.js/Prisma deploy path documented in README + /prisma/schema.prisma.

export type Role = "CUSTOMER" | "OPS_MANAGER" | "TECHNICIAN" | "ADMIN";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type RequestStatus =
  | "CREATED" | "VALIDATED" | "PENDING_APPROVAL" | "APPROVED"
  | "ASSIGNED" | "IN_PROGRESS" | "PENDING_VERIFICATION" | "CLOSED" | "EXCEPTION";

export type ExceptionType = "TECH_DROPOUT" | "PART_UNAVAILABLE" | "SLA_BREACH";

export interface Site { id: string; name: string; code: string; lat: number; lng: number; address: string; }
export interface Machine {
  id: string; code: string; name: string; siteId: string;
  status: "OPERATIONAL" | "DEGRADED" | "DOWN" | "MAINTENANCE";
  eligible: boolean; warrantyActive: boolean; contractActive: boolean;
  skills: string[]; // skills required to service it
}
export interface AppUser {
  id: string; name: string; email: string; role: Role; siteId?: string;
  password: string; // demo only (plain) — real deploy uses NextAuth + bcrypt
}
export interface Technician {
  id: string; userId: string; name: string; siteId: string;
  skills: string[]; certifications: string[];
  lat: number; lng: number; online: boolean; currentLoad: number; // 0..1
  availability: number; // 0..1 (1 = fully free this week)
}
export interface PartInventory { id: string; sku: string; name: string; qty: number; reservedQty: number; siteId: string; unitCost: number; }
export interface ServiceRequest {
  id: string; code: string; machineId: string; siteId: string;
  title: string; description: string; priority: Priority;
  requiredSkills: string[]; requiredParts: { sku: string; qty: number }[];
  status: RequestStatus; slaDeadline: string; createdBy: string; createdAt: string;
  slaWarned?: boolean; validationReport?: ValidationReport;
}
export type CheckResult = "pass" | "warn" | "fail";
export interface ValidationCheck { name: string; result: CheckResult; message: string; }
export interface ValidationReport { checks: ValidationCheck[]; overall: CheckResult; at: string; }

export interface Reservation { id: string; requestId: string; sku: string; siteId: string; qty: number; createdAt: string; }
export interface Assignment {
  id: string; requestId: string; technicianId: string; score: number;
  breakdown: ScoreBreakdown; explanation: string; active: boolean; createdAt: string;
}
export interface ScoreBreakdown { skillMatch: number; proximity: number; availability: number; workload: number; total: number; }
export interface TaskLog { id: string; requestId: string; authorId: string; authorName: string; text: string; at: string; kind: "NOTE"|"STATUS"|"PHOTO"; }
export interface Attachment { id: string; requestId: string; name: string; url: string; note?: string; at: string; }
export interface ExceptionFlag {
  id: string; requestId: string; type: ExceptionType; message: string;
  resolved: boolean; resolvedBy?: string; createdAt: string;
  suggestion?: string; candidateId?: string;
}
export interface NotificationMsg { id: string; toRole?: Role; toUserId?: string; title: string; body: string; at: string; read?: boolean; }
export interface AuditEntry { id: string; actor: string; action: string; entity: string; entityId: string; payload: unknown; prevHash: string; hash: string; at: string; }

export type DomainEventName = "RequestCreated"|"RequestApproved"|"TechnicianAssigned"|"ExceptionRaised"|"RequestClosed"|"StatusChanged"|"StoreChanged";
export interface DomainEvent { name: DomainEventName; at: string; payload: Record<string, unknown>; }

export const PRIORITY_SLA_HOURS: Record<Priority, number> = { P1: 4, P2: 24, P3: 72, P4: 168 };
export const STATUS_ORDER: RequestStatus[] = ["CREATED","VALIDATED","PENDING_APPROVAL","APPROVED","ASSIGNED","IN_PROGRESS","PENDING_VERIFICATION","CLOSED"];
