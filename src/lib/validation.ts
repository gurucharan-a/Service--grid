import type { Machine, PartInventory, Site, ValidationReport } from "@/types";
import { nowISO } from "./geo";

// Step 1 of workflow: validation on create. Returns structured pass/warn/fail report.
export function validateRequest(args: {
  machine?: Machine; site?: Site;
  priority?: string;
  requiredParts: { sku: string; qty: number }[];
  inventory: PartInventory[];
}): ValidationReport {
  const { machine, site, priority, requiredParts, inventory } = args;
  const checks: ValidationReport["checks"] = [];
  if (!machine) checks.push({ name: "machine_eligible", result: "fail", message: "Machine not found." });
  else if (!machine.eligible) checks.push({ name: "machine_eligible", result: "fail", message: `${machine.code} is ineligible (warranty/contract lapsed or decommissioned).` });
  else if (machine.status === "DOWN") checks.push({ name: "machine_eligible", result: "warn", message: `${machine.code} is DOWN — eligible for urgent service.` });
  else checks.push({ name: "machine_eligible", result: "pass", message: `${machine.code} eligible (contract ✓).` });

  checks.push(site
    ? { name: "site_valid", result: "pass", message: `Site ${site.name} verified.` }
    : { name: "site_valid", result: "fail", message: "Site invalid." });

  checks.push(priority
    ? { name: "priority_set", result: "pass", message: `Priority ${priority} set; SLA clock started.` }
    : { name: "priority_set", result: "fail", message: "Priority missing." });

  const skills = machine?.skills ?? [];
  checks.push(skills.length
    ? { name: "skills_derived", result: "pass", message: `Required skills derived: ${skills.join(", ")}.` }
    : { name: "skills_derived", result: "warn", message: "No skill hints on machine — generic technician OK." });

  if (!requiredParts.length) {
    checks.push({ name: "parts_availability", result: "pass", message: "No parts required." });
  } else {
    for (const rp of requiredParts) {
      const avail = inventory.filter((p) => p.sku === rp.sku).reduce((s, p) => s + (p.qty - p.reservedQty), 0);
      if (avail >= rp.qty) checks.push({ name: `parts:${rp.sku}`, result: "pass", message: `${rp.sku}: need ${rp.qty}, available ${avail}.` });
      else if (avail > 0) checks.push({ name: `parts:${rp.sku}`, result: "warn", message: `${rp.sku}: need ${rp.qty}, only ${avail} free — partial.` });
      else checks.push({ name: `parts:${rp.sku}`, result: "fail", message: `${rp.sku}: need ${rp.qty}, none free — will raise PART_UNAVAILABLE.` });
    }
  }
  const overall = checks.some((c) => c.result === "fail") ? "fail" : checks.some((c) => c.result === "warn") ? "warn" : "pass";
  return { checks, overall, at: nowISO() };
}
