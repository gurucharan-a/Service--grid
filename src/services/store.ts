import { useSyncExternalStore } from "react";
import { bus } from "@/lib/eventBus";
import { chainHash, nowISO, slaElapsedRatio, uid } from "@/lib/geo";
import { validateRequest } from "@/lib/validation";
import { rankTechnicians } from "@/lib/allocation";
import { assertTransition } from "@/lib/stateMachine";
import { aiAdapter, notificationAdapter } from "@/adapters/impl";
import { MACHINES as SEED_M, PARTS as SEED_P, SITES as SEED_S, TECHNICIANS as SEED_T } from "@/data/seed";
import type {
  AppUser, Assignment, Attachment, AuditEntry, ExceptionFlag, ExceptionType,
  Machine, NotificationMsg, PartInventory, Reservation, ServiceRequest, Site, TaskLog, Technician,
} from "@/types";
import { PRIORITY_SLA_HOURS } from "@/types";

export interface DB {
  sites: Site[]; machines: Machine[]; techs: Technician[];
  parts: PartInventory[]; requests: ServiceRequest[];
  reservations: Reservation[]; assignments: Assignment[];
  logs: TaskLog[]; attachments: Attachment[];
  exceptions: ExceptionFlag[]; notifications: NotificationMsg[];
  audit: AuditEntry[]; users: AppUser[];
}

const KEY = "servicegrid_db_v1";
let seq = 1040;

function freshDB(): DB {
  return {
    sites: SEED_S, machines: SEED_M, techs: SEED_T, parts: SEED_P,
    requests: [
      {
        id: "r-hero", code: "SR-1041", machineId: "m-104", siteId: "site-a",
        title: "Conveyor C-4 halted — motor trip suspected",
        description: "Line C-4 stopped mid-shift. Suspected drive motor overload; burning smell near MCC. Need urgent attendance.",
        priority: "P1", requiredSkills: ["electrical", "conveyor", "plc"],
        requiredParts: [{ sku: "BELT-V88", qty: 2 }, { sku: "FUSE-10A", qty: 4 }],
        status: "IN_PROGRESS", slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
        createdBy: "u-cust", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
      },
      {
        id: "r-2", code: "SR-1042", machineId: "m-102", siteId: "site-a",
        title: "CNC spindle vibration high", description: "Vibration above normal on spindle; finish deteriorating.",
        priority: "P2", requiredSkills: ["electrical", "plc"], requiredParts: [{ sku: "BRG-6205", qty: 2 }],
        status: "PENDING_APPROVAL", slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
        createdBy: "u-cust", createdAt: new Date().toISOString(),
      },
    ],
    reservations: [], assignments: [
      { id: "a-hero", requestId: "r-hero", technicianId: "t-01", score: 0.87, breakdown: { skillMatch: 1, proximity: 0.97, availability: 0.9, workload: 0.3, total: 0.87 }, explanation: "Tara Tech is the best fit: full skill match, 0.8km away, high availability.", active: true, createdAt: new Date().toISOString() },
    ],
    logs: [{ id: "l1", requestId: "r-hero", authorId: "t-01", authorName: "Tara Tech", text: "On site. Isolating drive motor; checking MCC fuses.", at: new Date().toISOString(), kind: "NOTE" }],
    attachments: [], exceptions: [], notifications: [
      { id: "n1", title: "SR-1041 assigned", body: "Tara Tech assigned to Conveyor C-4 (P1).", at: new Date().toISOString() },
    ],
    audit: [], users: [
      { id: "u-cust", name: "Priya Customer", email: "customer@grid.io", role: "CUSTOMER", siteId: "site-a", password: "demo" },
      { id: "u-ops", name: "Omar Ops", email: "ops@grid.io", role: "OPS_MANAGER", password: "demo" },
      { id: "u-tech", name: "Tara Tech", email: "tech@grid.io", role: "TECHNICIAN", password: "demo" },
      { id: "u-admin", name: "Ada Admin", email: "admin@grid.io", role: "ADMIN", password: "demo" },
    ],
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const db = JSON.parse(raw) as DB; seq = 1040 + db.requests.length + 10; return db; }
  } catch {}
  return freshDB();
}

let db: DB = load();
const listeners = new Set<() => void>();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
  listeners.forEach((l) => l());
  bus.emit("StoreChanged", { at: nowISO() });
}
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function useDB(): DB {
  useSyncExternalStore(subscribe, () => db);
  return db;
}

// ---- audit (hash-chained) ----
function audit(actor: string, action: string, entity: string, entityId: string, payload: unknown) {
  const prev = db.audit.length ? db.audit[db.audit.length - 1].hash : "GENESIS";
  const body = JSON.stringify({ actor, action, entity, entityId, payload });
  const hash = chainHash(prev, body);
  db.audit.push({ id: uid("audit"), actor, action, entity, entityId, payload, prevHash: prev, hash, at: nowISO() });
}
export function verifyChain(): { ok: boolean; badIndex: number } {
  for (let i = 0; i < db.audit.length; i++) {
    const e = db.audit[i];
    const expectPrev = i === 0 ? "GENESIS" : db.audit[i - 1].hash;
    if (e.prevHash !== expectPrev) return { ok: false, badIndex: i };
    if (chainHash(e.prevHash, JSON.stringify({ actor: e.actor, action: e.action, entity: e.entity, entityId: e.entityId, payload: e.payload })) !== e.hash)
      return { ok: false, badIndex: i };
  }
  return { ok: true, badIndex: -1 };
}

// ---- workflow actions (enforce state machine + RBAC at call sites) ----
export const store = {
  reset() { localStorage.removeItem(KEY); db = freshDB(); audit("system", "DEMO_RESET", "db", "all", {}); persist(); },
  get db() { return db; },

  createRequest(input: { machineId: string; title: string; description: string; priority: "P1"|"P2"|"P3"|"P4"; requiredParts: { sku: string; qty: number }[]; slaDeadline?: string }, actorId: string) {
    const m = db.machines.find((x) => x.id === input.machineId);
    const site = db.sites.find((s) => s.id === m?.siteId);
    const report = validateRequest({ machine: m, site, priority: input.priority, requiredParts: input.requiredParts, inventory: db.parts });
    const hours = PRIORITY_SLA_HOURS[input.priority];
    const code = `SR-${seq++}`;
    const req: ServiceRequest = {
      id: uid("r"), code, machineId: input.machineId, siteId: m?.siteId ?? site?.id ?? "site-a",
      title: input.title, description: input.description, priority: input.priority,
      requiredSkills: m?.skills ?? [], requiredParts: input.requiredParts,
      status: "CREATED", slaDeadline: input.slaDeadline ?? new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      createdBy: actorId, createdAt: nowISO(), validationReport: report,
    };
    db.requests.unshift(req);
    audit(actorId, "CREATE", "ServiceRequest", req.id, { code, report: report.overall });
    bus.emit("RequestCreated", { requestId: req.id, code });
    // CREATED -> VALIDATED -> PENDING_APPROVAL (auto for P1 under threshold: warn/pass auto-approves to APPROVED)
    this.setStatus(req.id, "VALIDATED", actorId, { silent: true });
    this.setStatus(req.id, "PENDING_APPROVAL", actorId, { silent: true });
    if (input.priority === "P1" && report.overall !== "fail") this.approve(req.id, actorId, true);
    notificationAdapter.notify("ops", "New request " + code, `${input.title} [${input.priority}] — validation ${report.overall}`);
    persist();
    return req;
  },

  setStatus(requestId: string, to: ServiceRequest["status"], actorId: string, opts?: { silent?: boolean }) {
    const r = db.requests.find((x) => x.id === requestId);
    if (!r) throw new Error("Request not found");
    assertTransition(r.status, to);
    const from = r.status;
    r.status = to;
    db.logs.unshift({ id: uid("log"), requestId, authorId: actorId, authorName: db.users.find((u) => u.id === actorId)?.name ?? actorId, text: `Status ${from} → ${to}`, at: nowISO(), kind: "STATUS" });
    audit(actorId, "STATUS", "ServiceRequest", requestId, { from, to });
    bus.emit("StatusChanged", { requestId, from, to });
    if (to === "CLOSED") bus.emit("RequestClosed", { requestId });
    if (!opts?.silent) persist();
  },

  approve(requestId: string, actorId: string, auto = false) {
    const r = db.requests.find((x) => x.id === requestId);
    if (!r) throw new Error("not found");
    if (r.status === "PENDING_APPROVAL") this.setStatus(requestId, "APPROVED", actorId, { silent: true });
    else if (r.status !== "APPROVED") throw new Error(`Cannot approve from ${r.status}`);
    audit(actorId, auto ? "AUTO_APPROVE" : "APPROVE", "ServiceRequest", requestId, {});
    bus.emit("RequestApproved", { requestId, auto });
    persist();
  },

  rank(requestId: string, excludeIds: string[] = []) {
    const r = db.requests.find((x) => x.id === requestId)!;
    const site = db.sites.find((s) => s.id === r.siteId);
    return rankTechnicians(r, db.techs.filter((t) => t.online), site, excludeIds);
  },

  // atomic reservation: check-then-reserve in one pass, no oversell
  assign(requestId: string, techId: string, actorId: string) {
    const r = db.requests.find((x) => x.id === requestId)!;
    const tech = db.techs.find((t) => t.id === techId)!;
    // parts check
    for (const rp of r.requiredParts) {
      const free = db.parts.filter((p) => p.sku === rp.sku).reduce((s, p) => s + (p.qty - p.reservedQty), 0);
      if (free < rp.qty) {
        this.raiseException(requestId, "PART_UNAVAILABLE", `${rp.sku}: need ${rp.qty}, only ${free} free.`, actorId);
        throw new Error(`Insufficient ${rp.sku}`);
      }
    }
    // reserve (prefer same-site stock)
    for (const rp of r.requiredParts) {
      let need = rp.qty;
      const cands = db.parts.filter((p) => p.sku === rp.sku && p.qty - p.reservedQty > 0)
        .sort((a, b) => (a.siteId === r.siteId ? -1 : 1) - (b.siteId === r.siteId ? -1 : 1));
      for (const c of cands) {
        if (need <= 0) break;
        const take = Math.min(need, c.qty - c.reservedQty);
        c.reservedQty += take; need -= take;
        db.reservations.push({ id: uid("res"), requestId, sku: rp.sku, siteId: c.siteId, qty: take, createdAt: nowISO() });
      }
    }
    db.assignments.forEach((a) => { if (a.requestId === requestId) a.active = false; });
    const site = db.sites.find((s) => s.id === r.siteId);
    const ranked = rankTechnicians(r, [tech], site);
    const bd = ranked[0]?.breakdown ?? { skillMatch: 0, proximity: 0, availability: 0, workload: 0, total: 0 };
    aiAdapter.explainAssignment(tech.name, bd as any, r.code).then((explanation) => {
      const a = db.assignments.find((x) => x.requestId === requestId && x.active);
      if (a) { a.explanation = explanation; persist(); }
    });
    const a: Assignment = { id: uid("a"), requestId, technicianId: techId, score: bd.total, breakdown: bd, explanation: `${tech.name} assigned (score ${bd.total}).`, active: true, createdAt: nowISO() };
    db.assignments.unshift(a);
    tech.currentLoad = Math.min(1, tech.currentLoad + 0.15);
    if (r.status === "APPROVED" || r.status === "EXCEPTION") this.setStatus(requestId, "ASSIGNED", actorId, { silent: true });
    audit(actorId, "ASSIGN", "Assignment", a.id, { techId, score: bd.total });
    bus.emit("TechnicianAssigned", { requestId, techId, score: bd.total });
    notificationAdapter.notify(techId, `New job ${r.code}`, `${r.title} — accept in Technician view.`);
    persist();
    return a;
  },

  async reassign(requestId: string, actorId: string) {
    const failed = db.assignments.find((a) => a.requestId === requestId && a.active);
    const exclude = failed ? [failed.technicianId] : [];
    if (failed) failed.active = false;
    const ranked = this.rank(requestId, exclude);
    if (!ranked.length) throw new Error("No available technicians");
    // release old reservations for atomic re-reserve
    db.reservations.filter((x) => x.requestId === requestId).forEach((res) => {
      const p = db.parts.find((pp) => pp.sku === res.sku && pp.siteId === res.siteId);
      if (p) p.reservedQty = Math.max(0, p.reservedQty - res.qty);
    });
    db.reservations = db.reservations.filter((x) => x.requestId !== requestId);
    return this.assign(requestId, ranked[0].tech.id, actorId);
  },

  raiseException(requestId: string, type: ExceptionType, message: string, actorId: string, extra?: { candidateId?: string; suggestion?: string }) {
    const r = db.requests.find((x) => x.id === requestId);
    if (!r) throw new Error("not found");
    const ex: ExceptionFlag = { id: uid("ex"), requestId, type, message, resolved: false, createdAt: nowISO(), candidateId: extra?.candidateId, suggestion: extra?.suggestion };
    // nearest-site transfer suggestion for parts
    if (type === "PART_UNAVAILABLE" && !ex.suggestion) {
      const site = db.sites.find((s) => s.id === r.siteId);
      const other = db.parts.filter((p) => p.siteId !== r.siteId && p.qty - p.reservedQty > 0).slice(0, 2);
      ex.suggestion = other.length ? `Transfer ${other.map((o) => `${o.sku}×${o.qty - o.reservedQty} from ${o.siteId}`).join(", ")} → ${site?.code}` : "No stock at nearby sites — raise PO.";
    }
    // one-click candidate: best excluding failed
    if (!ex.candidateId) {
      const failedTech = db.assignments.find((a) => a.requestId === requestId && a.active)?.technicianId;
      const ranked = this.rank(requestId, failedTech ? [failedTech] : []);
      if (ranked[0]) { ex.candidateId = ranked[0].tech.id; ex.suggestion = (ex.suggestion ? ex.suggestion + " • " : "") + `Best fallback: ${ranked[0].tech.name} (score ${ranked[0].breakdown.total})`; }
    }
    db.exceptions.unshift(ex);
    db.notifications.unshift({ id: uid("n"), title: `Exception: ${type}`, body: `${r.code}: ${message}`, at: nowISO() });
    if (r.status !== "EXCEPTION") {
      try { this.setStatus(requestId, "EXCEPTION", actorId, { silent: true }); } catch {}
    }
    audit(actorId, "EXCEPTION", "ExceptionFlag", ex.id, { type, message });
    bus.emit("ExceptionRaised", { requestId, type, message });
    notificationAdapter.notify("ops", `Exception ${type}`, `${r.code}: ${message}`);
    persist();
    return ex;
  },

  resolveException(exId: string, actorId: string) {
    const ex = db.exceptions.find((e) => e.id === exId);
    if (!ex) return;
    ex.resolved = true; ex.resolvedBy = actorId;
    audit(actorId, "EXCEPTION_RESOLVE", "ExceptionFlag", exId, {});
    persist();
  },

  // ---- demo controls (produce the REAL exception flow) ----
  dropoutTech(requestId: string, actorId: string) {
    const a = db.assignments.find((x) => x.requestId === requestId && x.active);
    if (a) { const t = db.techs.find((t) => t.id === a.technicianId); if (t) t.online = false; }
    return this.raiseException(requestId, "TECH_DROPOUT", `Assigned technician went offline.`, actorId);
  },
  depletePart(requestId: string, actorId: string) {
    const r = db.requests.find((x) => x.id === requestId)!;
    const sku = r.requiredParts[0]?.sku ?? "BELT-V88";
    db.parts.filter((p) => p.sku === sku).forEach((p) => { p.qty = p.reservedQty; }); // zero free stock
    return this.raiseException(requestId, "PART_UNAVAILABLE", `Reserved ${sku} falls short after stock recount.`, actorId);
  },
  fastForwardSLA(requestId: string, actorId: string) {
    const r = db.requests.find((x) => x.id === requestId)!;
    r.slaDeadline = new Date(Date.now() - 1000 * 60 * 5).toISOString();
    return this.raiseException(requestId, "SLA_BREACH", `SLA breached for ${r.code} (deadline passed).`, actorId);
  },
  iotAlert(machineCode: string, actorId: string) {
    const m = db.machines.find((x) => x.code === machineCode) ?? db.machines[3];
    const req = this.createRequest({ machineId: m.id, title: `IoT: threshold breach on ${m.code}`, description: "Telemetry vibration=128 > threshold 100. Auto-created P1.", priority: "P1", requiredParts: [] }, actorId);
    return req;
  },

  addLog(requestId: string, authorId: string, text: string, kind: TaskLog["kind"] = "NOTE") {
    const u = db.users.find((x) => x.id === authorId);
    db.logs.unshift({ id: uid("log"), requestId, authorId, authorName: u?.name ?? authorId, text, at: nowISO(), kind });
    audit(authorId, "TASKLOG", "TaskLog", requestId, { kind, text: text.slice(0, 140) });
    persist();
  },
  addAttachment(requestId: string, actorId: string, name: string, url: string, note?: string) {
    db.attachments.unshift({ id: uid("att"), requestId, name, url, note, at: nowISO() });
    audit(actorId, "ATTACH", "Attachment", requestId, { name });
    persist();
  },

  // background SLA job — call on interval; warns at 80%, flags at 100%
  slaTick(actorId = "system") {
    let changed = false;
    for (const r of db.requests) {
      if (["CLOSED"].includes(r.status)) continue;
      const ratio = slaElapsedRatio(r.createdAt, r.slaDeadline);
      if (ratio >= 1 && !db.exceptions.some((e) => e.requestId === r.id && e.type === "SLA_BREACH" && !e.resolved)) {
        this.raiseException(r.id, "SLA_BREACH", `SLA breached for ${r.code}.`, actorId); changed = true;
      } else if (ratio >= 0.8 && !r.slaWarned) {
        r.slaWarned = true;
        db.notifications.unshift({ id: uid("n"), title: `SLA at risk: ${r.code}`, body: `${Math.round(ratio * 100)}% of SLA elapsed.`, at: nowISO() });
        changed = true;
      }
    }
    if (changed) persist();
  },
};

setInterval(() => { try { store.slaTick(); } catch {} }, 15000);
