import { useEffect, useState } from "react";
import { bus } from "./eventBus";
import type { DomainEvent } from "@/types";

// useSSE — in-browser transport subscribing to the EventBus.
// Next.js deploy: same hook points at /api/events (SSE) — identical event names.
export function useSSE() {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    setConnected(true);
    const off = bus.on("*", (e) => setEvents((prev) => [e, ...prev].slice(0, 60)));
    return () => { off(); setConnected(false); };
  }, []);
  return { events, connected };
}
