import type { Role } from "@/types";

export type DomainId = "operations" | "technician" | "customer" | "governance";

export interface DomainConfig {
  id: DomainId;
  num: string;
  code: string;
  kicker: string;
  name: string;
  title: string;
  description: string;
  short: string;
  role: Role;
  demoEmail: string;
}

export const domainConfig: Record<DomainId, DomainConfig> = {
  operations: {
    id: "operations",
    num: "01",
    code: "DOMAIN / 01",
    kicker: "OPERATIONS CONTROL",
    name: "Operations Control",
    title: "Operations sign in",
    description: "Access dispatch queues, technician routing and exception recovery.",
    short: "Dispatch, routing, SLA & exceptions",
    role: "OPS_MANAGER",
    demoEmail: "operator@servicegrid.demo",
  },
  technician: {
    id: "technician",
    num: "02",
    code: "DOMAIN / 02",
    kicker: "FIELD TECHNICIAN",
    name: "Field Technician",
    title: "Technician sign in",
    description: "Open assigned work, navigation, task logs and completion evidence.",
    short: "Assigned work, navigation & evidence",
    role: "TECHNICIAN",
    demoEmail: "tech@servicegrid.demo",
  },
  customer: {
    id: "customer",
    num: "03",
    code: "DOMAIN / 03",
    kicker: "CUSTOMER / SITE",
    name: "Customer / Site",
    title: "Customer sign in",
    description: "Create service requests, view assets and monitor completion status.",
    short: "Requests, assets & completion status",
    role: "CUSTOMER",
    demoEmail: "customer@servicegrid.demo",
  },
  governance: {
    id: "governance",
    num: "04",
    code: "DOMAIN / 04",
    kicker: "GOVERNANCE & ADMIN",
    name: "Governance & Admin",
    title: "Administrator sign in",
    description: "Review audit history, API keys, integrations and platform controls.",
    short: "Audit, API keys & integrations",
    role: "ADMIN",
    demoEmail: "admin@servicegrid.demo",
  },
};

export const DOMAIN_ORDER: DomainId[] = ["operations", "technician", "customer", "governance"];
