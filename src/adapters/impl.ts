import type { AIAdapter, IoTAdapter, LedgerAdapter, NotificationAdapter } from "./types";
import { chainHash } from "@/lib/geo";
import { bus } from "@/lib/eventBus";

// In-app + console (Telegram/email webhook plug-in point: set VITE_NOTIFY_WEBHOOK).
export const notificationAdapter: NotificationAdapter = {
  notify(to, title, body) {
    bus.emit("StoreChanged", { kind: "notification", to, title });
    const wh = (import.meta as any).env?.VITE_NOTIFY_WEBHOOK as string | undefined;
    if (wh) fetch(wh, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, title, body }) }).catch(() => {});
    console.info(`[notify:${to}] ${title} — ${body}`);
  },
};

// Claude API with deterministic fallback (keyword parser) so demo never breaks.
const SKILL_KEYS = ["hydraulics", "electrical", "plc", "welding", "pneumatics", "vibration", "compressor", "conveyor"];
const PART_KEYS = ["FLT-200", "BRG-6205", "SEAL-KIT", "BELT-V88", "OIL-ISO46", "SNSR-T100", "VALVE-P4", "FUSE-10A"];
export const aiAdapter: AIAdapter = {
  async parseComplaint(freeText: string) {
    const key = (import.meta as any).env?.VITE_CLAUDE_API_KEY as string | undefined;
    if (key) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 300, messages: [{ role: "user", content: `Parse this industrial equipment complaint into JSON {machineCodeGuess, skills[], parts[{sku,qty}], priority P1-P4, title}: ${freeText}` }] }),
        });
        const j = await r.json();
        const txt: string = j?.content?.[0]?.text ?? "";
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      } catch { /* fall through to deterministic */ }
    }
    const t = freeText.toLowerCase();
    const skills = SKILL_KEYS.filter((k) => t.includes(k));
    const parts = PART_KEYS.filter((k) => t.includes(k.toLowerCase())).map((sku) => ({ sku, qty: 1 }));
    const priority = /smoke|fire|down|halt|stopped|leak.*oil|danger/.test(t) ? "P1" : /urgent|asap|vibration|overheat/.test(t) ? "P2" : "P3";
    const mcode = (freeText.match(/M-\d{3}/i)?.[0] ?? "M-104").toUpperCase();
    const title = freeText.slice(0, 70) || "Equipment issue";
    return { machineCodeGuess: mcode, skills: skills.length ? skills : ["electrical"], parts, priority: priority as any, title };
  },
  async explainAssignment(techName, b, reqCode) {
    const key = (import.meta as any).env?.VITE_CLAUDE_API_KEY as string | undefined;
    const fallback = `${techName} is the best fit for ${reqCode}: skill match ${(b.skillMatch * 100).toFixed(0)}% (weight 40%), proximity score ${b.proximity} (25%), availability ${b.availability} (20%), workload headroom ${(1 - b.workload).toFixed(2)} (15%). Total ${b.total}.`;
    if (!key) return fallback;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 150, messages: [{ role: "user", content: `In one plain-English sentence for an ops manager, explain why ${techName} was assigned to ${reqCode} given scores ${JSON.stringify(b)}.` }] }),
      });
      const j = await r.json();
      return j?.content?.[0]?.text ?? fallback;
    } catch { return fallback; }
  },
};

export const iotAdapter: IoTAdapter = {
  ingest(machineId, metric, value) {
    const breach = value > 100;
    return { breach, message: breach ? `${metric}=${value} breached threshold 100 on ${machineId}` : `${metric}=${value} nominal` };
  },
};

export const ledgerAdapter: LedgerAdapter = {
  append(entry) { return chainHash("ledger", JSON.stringify(entry)); },
  verify(chain) {
    for (let i = 0; i < chain.length; i++) {
      const expect = chainHash(chain[i].prevHash, chain[i].body);
      if (expect !== chain[i].hash) return { ok: false, badIndex: i };
    }
    return { ok: true, badIndex: -1 };
  },
};
