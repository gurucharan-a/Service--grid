import { z } from "zod";

export const prioritySchema = z.enum(["P1", "P2", "P3", "P4"]);
export const statusSchema = z.enum(["CREATED","VALIDATED","PENDING_APPROVAL","APPROVED","ASSIGNED","IN_PROGRESS","PENDING_VERIFICATION","CLOSED","EXCEPTION"]);

export const createRequestSchema = z.object({
  machineId: z.string().min(1, "Machine required"),
  title: z.string().min(4, "Title too short").max(120),
  description: z.string().min(8, "Describe the issue").max(2000),
  priority: prioritySchema,
  requiredParts: z.array(z.object({ sku: z.string().min(1), qty: z.number().int().min(1).max(50) })).default([]),
  slaDeadline: z.string().optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const telemetrySchema = z.object({
  machineId: z.string().min(1),
  metric: z.enum(["vibration", "temperature", "pressure", "current"]),
  value: z.number(),
  threshold: z.number(),
  unit: z.string().default(""),
});
export type TelemetryInput = z.infer<typeof telemetrySchema>;

export const taskLogSchema = z.object({
  requestId: z.string().min(1),
  text: z.string().min(1).max(2000),
  kind: z.enum(["NOTE", "STATUS", "PHOTO"]).default("NOTE"),
});
export const userSchema = z.object({
  name: z.string().min(2), email: z.string().email(), role: z.enum(["CUSTOMER","OPS_MANAGER","TECHNICIAN","ADMIN"]),
});
