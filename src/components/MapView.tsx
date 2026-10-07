import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ServiceRequest, Site, Technician } from "@/types";

const colorFor = (s: ServiceRequest["status"]) =>
  s === "EXCEPTION" ? "#ef4444" : s === "CLOSED" ? "#22c55e" : s === "IN_PROGRESS" ? "#f59e0b" : s === "ASSIGNED" ? "#8b5cf6" : "#0ea5e9";

// MapAdapter (Leaflet UI + OSM tiles). Next.js: same component under app/(ops)/map.
export default function MapView({ sites, techs, requests }: { sites: Site[]; techs: Technician[]; requests: ServiceRequest[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([13.02, 80.16], 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // clear dynamic layers
    map.eachLayer((l) => { if (l instanceof L.Marker || l instanceof L.CircleMarker) map.removeLayer(l); });
    sites.forEach((s) => {
      L.marker([s.lat, s.lng]).addTo(map).bindPopup(`<b>${s.name}</b><br/>${s.address}`);
      L.circle([s.lat, s.lng], { radius: 2500, color: "#6366f1", weight: 1, fillOpacity: 0.06 }).addTo(map);
    });
    techs.forEach((t) => {
      L.circleMarker([t.lat, t.lng], { radius: 7, color: t.online ? "#10b981" : "#ef4444", fillColor: t.online ? "#10b981" : "#ef4444", fillOpacity: 0.9, weight: 2 })
        .addTo(map).bindPopup(`<b>${t.name}</b><br/>${t.online ? "online" : "OFFLINE"} • load ${t.currentLoad}<br/>${t.skills.join(", ")}`);
    });
    requests.filter((r) => r.status !== "CLOSED").forEach((r) => {
      const s = sites.find((x) => x.id === r.siteId);
      if (!s) return;
      const jitter = (r.code.charCodeAt(3) % 7) * 0.004;
      L.circleMarker([s.lat + jitter, s.lng + jitter], { radius: 9, color: colorFor(r.status), fillColor: colorFor(r.status), fillOpacity: 0.55, weight: 2 })
        .addTo(map).bindPopup(`<b>${r.code}</b> [${r.priority}]<br/>${r.title}<br/>${r.status}`);
    });
  }, [sites, techs, requests]);

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div ref={ref} className="h-[340px] w-full z-0" />
      <div className="flex flex-wrap gap-2 bg-card px-3 py-2 text-[11px]">
        {[["#0ea5e9", "open"], ["#8b5cf6", "assigned"], ["#f59e0b", "in-progress"], ["#ef4444", "exception"], ["#22c55e", "closed"], ["#10b981", "tech online"]].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
        ))}
        <span className="ml-auto text-muted-foreground">Leaflet + OpenStreetMap</span>
      </div>
    </div>
  );
}
