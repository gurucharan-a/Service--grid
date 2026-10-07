// Adapter interfaces — architecture proof. Working impls below; stubs in ./stubs.ts.
export interface NotificationAdapter { notify(to: string, title: string, body: string): Promise<void> | void; }
export interface AIAdapter {
  parseComplaint(freeText: string): Promise<{ machineCodeGuess?: string; skills: string[]; parts: { sku: string; qty: number }[]; priority: "P1"|"P2"|"P3"|"P4"; title: string }>;
  explainAssignment(techName: string, breakdown: Record<string, number>, reqCode: string): Promise<string>;
}
export interface IoTAdapter { ingest(machineId: string, metric: string, value: number): { breach: boolean; message: string }; }
export interface LedgerAdapter { append(entry: unknown): string; verify(chain: { hash: string; prevHash: string; body: string }[]): { ok: boolean; badIndex: number }; }
export interface MapAdapter { kind: "leaflet-osm" };
