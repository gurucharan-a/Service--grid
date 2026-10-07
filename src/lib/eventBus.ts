// Typed in-process EventBus — the extensibility backbone.
// Next.js deploy: swap transport for Kafka/SQS without touching domain code (see adapters/stubs).
import type { DomainEvent, DomainEventName } from "@/types";

type Handler = (e: DomainEvent) => void;

class EventBus {
  private handlers = new Map<DomainEventName | "*", Set<Handler>>();
  on(name: DomainEventName | "*", fn: Handler): () => void {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name)!.add(fn);
    return () => this.handlers.get(name)?.delete(fn);
  }
  emit(name: DomainEventName, payload: Record<string, unknown> = {}) {
    const e: DomainEvent = { name, at: new Date().toISOString(), payload };
    this.handlers.get(name)?.forEach((fn) => { try { fn(e); } catch {} });
    this.handlers.get("*")?.forEach((fn) => { try { fn(e); } catch {} });
  }
}

export const bus = new EventBus();
