import type { ScoreBreakdown, ServiceRequest, Site, Technician } from "@/types";
import { haversineKm } from "./geo";

// Allocation engine: score = 0.4*skill + 0.25*proximity + 0.2*availability + 0.15*(1-workload)
export interface RankedTech { tech: Technician; breakdown: ScoreBreakdown; }

export function scoreTechnician(tech: Technician, req: ServiceRequest, site?: Site): ScoreBreakdown {
  const need = req.requiredSkills ?? [];
  const hit = need.length ? need.filter((s) => tech.skills.includes(s)).length / need.length : 0.6;
  const dist = site ? haversineKm(tech.lat, tech.lng, site.lat, site.lng) : 25;
  const proximity = Math.max(0, 1 - dist / 120); // 120km normalizer
  const availability = tech.online ? tech.availability : 0;
  const workload = Math.max(0, Math.min(1, tech.currentLoad));
  const total = +(0.4 * hit + 0.25 * proximity + 0.2 * availability + 0.15 * (1 - workload)).toFixed(4);
  return { skillMatch: +hit.toFixed(3), proximity: +proximity.toFixed(3), availability: +availability.toFixed(3), workload: +workload.toFixed(3), total };
}

export function rankTechnicians(req: ServiceRequest, techs: Technician[], site: Site | undefined, excludeIds: string[] = []): RankedTech[] {
  return techs
    .filter((t) => !excludeIds.includes(t.id))
    .map((tech) => ({ tech, breakdown: scoreTechnician(tech, req, site) }))
    .sort((a, b) => b.breakdown.total - a.breakdown.total);
}
