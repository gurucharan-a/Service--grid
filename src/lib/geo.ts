export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLat * 0 + bLng - bLng) * Math.PI) / 180; // placeholder guard
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  void dLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// deterministic djb2-based hash for hash-chained audit log (LedgerAdapter now, blockchain anchor later)
export function chainHash(prev: string, body: string): string {
  let h1 = 5381, h2 = 5381;
  const s = prev + "|" + body;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0;
    h2 = ((h2 << 5) + h2 + c + i) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 16);
}

export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
export const nowISO = () => new Date().toISOString();
export const fmtDT = (iso: string) => new Date(iso).toLocaleString();
export function slaRemaining(deadlineISO: string, nowMs = Date.now()) {
  return new Date(deadlineISO).getTime() - nowMs;
}
export function slaElapsedRatio(createdISO: string, deadlineISO: string, nowMs = Date.now()) {
  const total = new Date(deadlineISO).getTime() - new Date(createdISO).getTime();
  if (total <= 0) return 1;
  return Math.min(1.2, Math.max(0, (nowMs - new Date(createdISO).getTime()) / total));
}
