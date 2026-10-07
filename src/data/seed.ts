import type { Machine, PartInventory, Site, Technician } from "@/types";

// 3 sites (Chennai industrial belt lat/lng), 12 machines (hero M-104), 10 techs, 30 parts.
export const SITES: Site[] = [
  { id: "site-a", name: "Site A — Guindy Plant", code: "GND", lat: 13.0067, lng: 80.2206, address: "Guindy Industrial Estate, Chennai" },
  { id: "site-b", name: "Site B — Ambattur Works", code: "AMB", lat: 13.1143, lng: 80.1548, address: "Ambattur Industrial Estate, Chennai" },
  { id: "site-c", name: "Site C — Sriperumbudur Unit", code: "SRP", lat: 12.9689, lng: 79.9462, address: "SIPOT, Sriperumbudur" },
];

export const MACHINES: Machine[] = [
  { id: "m-101", code: "M-101", name: "Hydraulic Press 150T", siteId: "site-a", status: "OPERATIONAL", eligible: true, warrantyActive: true, contractActive: true, skills: ["hydraulics", "welding"] },
  { id: "m-102", code: "M-102", name: "CNC Mill VMC-850", siteId: "site-a", status: "DEGRADED", eligible: true, warrantyActive: false, contractActive: true, skills: ["electrical", "plc"] },
  { id: "m-103", code: "M-103", name: "Air Compressor 75kW", siteId: "site-a", status: "OPERATIONAL", eligible: true, warrantyActive: true, contractActive: true, skills: ["compressor", "pneumatics"] },
  { id: "m-104", code: "M-104", name: "Conveyor Line C-4 (HERO)", siteId: "site-a", status: "DOWN", eligible: true, warrantyActive: true, contractActive: true, skills: ["electrical", "conveyor", "plc"] },
  { id: "m-105", code: "M-105", name: "Injection Moulder IM-22", siteId: "site-b", status: "OPERATIONAL", eligible: true, warrantyActive: false, contractActive: true, skills: ["hydraulics", "electrical"] },
  { id: "m-106", code: "M-106", name: "Boiler B-2", siteId: "site-b", status: "MAINTENANCE", eligible: true, warrantyActive: true, contractActive: true, skills: ["welding", "pneumatics"] },
  { id: "m-107", code: "M-107", name: "Lathe L-9", siteId: "site-b", status: "OPERATIONAL", eligible: false, warrantyActive: false, contractActive: false, skills: ["electrical"] },
  { id: "m-108", code: "M-108", name: "Vibration Tester VT-1", siteId: "site-b", status: "DEGRADED", eligible: true, warrantyActive: true, contractActive: true, skills: ["vibration", "electrical"] },
  { id: "m-109", code: "M-109", name: "Packaging Line P-3", siteId: "site-c", status: "OPERATIONAL", eligible: true, warrantyActive: true, contractActive: true, skills: ["conveyor", "plc"] },
  { id: "m-110", code: "M-110", name: "Chiller CH-500", siteId: "site-c", status: "OPERATIONAL", eligible: true, warrantyActive: false, contractActive: true, skills: ["compressor", "electrical"] },
  { id: "m-111", code: "M-111", name: "Press Brake PB-12", siteId: "site-c", status: "DOWN", eligible: true, warrantyActive: true, contractActive: true, skills: ["hydraulics", "plc"] },
  { id: "m-112", code: "M-112", name: "Generator G-250kVA", siteId: "site-c", status: "OPERATIONAL", eligible: true, warrantyActive: true, contractActive: true, skills: ["electrical", "vibration"] },
];

export const TECHNICIANS: Technician[] = [
  { id: "t-01", userId: "u-tech", name: "Tara Tech", siteId: "site-a", skills: ["electrical", "conveyor", "plc"], certifications: ["PLC-L2"], lat: 13.01, lng: 80.225, online: true, currentLoad: 0.3, availability: 0.9 },
  { id: "t-02", userId: "u-t2", name: "Ravi Kumar", siteId: "site-a", skills: ["hydraulics", "welding"], certifications: ["WELD-3G"], lat: 13.0, lng: 80.21, online: true, currentLoad: 0.6, availability: 0.7 },
  { id: "t-03", userId: "u-t3", name: "Sana Iqbal", siteId: "site-a", skills: ["electrical", "plc", "vibration"], certifications: ["ELEC-A"], lat: 13.02, lng: 80.23, online: true, currentLoad: 0.2, availability: 0.95 },
  { id: "t-04", userId: "u-t4", name: "Manoj Das", siteId: "site-b", skills: ["hydraulics", "pneumatics"], certifications: ["HYD-1"], lat: 13.11, lng: 80.15, online: true, currentLoad: 0.5, availability: 0.6 },
  { id: "t-05", userId: "u-t5", name: "Kavya R", siteId: "site-b", skills: ["electrical", "vibration", "plc"], certifications: ["VIB-CAT2"], lat: 13.12, lng: 80.16, online: false, currentLoad: 0.8, availability: 0.3 },
  { id: "t-06", userId: "u-t6", name: "Arjun Nair", siteId: "site-b", skills: ["welding", "pneumatics"], certifications: ["WELD-6G"], lat: 13.1, lng: 80.14, online: true, currentLoad: 0.4, availability: 0.8 },
  { id: "t-07", userId: "u-t7", name: "Divya S", siteId: "site-c", skills: ["conveyor", "plc", "compressor"], certifications: ["PLC-L3"], lat: 12.97, lng: 79.95, online: true, currentLoad: 0.35, availability: 0.85 },
  { id: "t-08", userId: "u-t8", name: "Imran Sheikh", siteId: "site-c", skills: ["compressor", "electrical"], certifications: ["HVAC-2"], lat: 12.96, lng: 79.94, online: true, currentLoad: 0.7, availability: 0.5 },
  { id: "t-09", userId: "u-t9", name: "Lena Mathew", siteId: "site-c", skills: ["hydraulics", "plc", "electrical"], certifications: ["HYD-2", "PLC-L2"], lat: 12.975, lng: 79.955, online: true, currentLoad: 0.15, availability: 1.0 },
  { id: "t-10", userId: "u-t10", name: "Vikram Rao", siteId: "site-a", skills: ["conveyor", "welding", "electrical"], certifications: ["MECH-1"], lat: 13.005, lng: 80.215, online: true, currentLoad: 0.55, availability: 0.65 },
];

const PART_DEFS = [
  ["FLT-200", "Hydraulic Filter 200mic"], ["BRG-6205", "Bearing 6205-ZZ"], ["SEAL-KIT", "Seal Kit Universal"],
  ["BELT-V88", "V-Belt V88"], ["OIL-ISO46", "Hydraulic Oil ISO46 20L"], ["SNSR-T100", "Temp Sensor T100"],
  ["VALVE-P4", "Pneumatic Valve P4"], ["FUSE-10A", "Fuse 10A ceramic"], ["PLC-IO8", "PLC IO Module 8ch"], ["CNV-RLR", "Conveyor Roller 89mm"],
];
export const PARTS: PartInventory[] = PART_DEFS.flatMap(([sku, name], i) =>
  SITES.map((s, si) => ({
    id: `p-${sku}-${s.code}`, sku, name, siteId: s.id,
    qty: [8, 5, 3][si] + ((i * 7 + si * 3) % 5),
    reservedQty: 0, unitCost: 500 + i * 350,
  }))
);
