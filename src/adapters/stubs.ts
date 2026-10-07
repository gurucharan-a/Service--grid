// Stub interfaces + docs only (per spec): mobile native app, cloud queue.
/** MobileAdapter (STUB) — Technician PWA in this repo is the responsive web
 *  implementation. A native wrapper (Capacitor/React-Native) would implement:
 *  pushTokens(), offlineQueue(), cameraUpload() and reuse the same
 *  domain events + Zod schemas. See README "Extensibility". */
export interface MobileAdapter {
  pushTokens(userId: string): Promise<string[]>;
  offlineQueue(): { queued: number; flush(): Promise<void> };
}
/** QueueAdapter (STUB) — in-process EventBus is the default transport.
 *  Production would bind DomainEvent -> Kafka/SQS topic `servicegrid.events`
 *  with exactly-once consumer writing to Notification/Ledger adapters. */
export interface QueueAdapter {
  publish(topic: string, event: unknown): Promise<void>;
  subscribe(topic: string, handler: (e: unknown) => void): () => void;
}
export const STUB_DOCS = "See README section 'Extensibility (architecture proof)'.";
