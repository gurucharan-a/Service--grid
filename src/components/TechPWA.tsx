import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { store, useDB } from "@/services/store";
import { fmtDT } from "@/lib/geo";
import type { AppUser } from "@/types";

// Responsive PWA view for technicians (installable via manifest + service worker stub).
export default function TechPWA({ me, onOpen }: { me: AppUser; onOpen: (id: string) => void }) {
  const db = useDB();
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState("");
  const myTechIds = db.techs.filter((t) => t.userId === me.id || me.role !== "TECHNICIAN").map((t) => t.id);
  const myAssigns = db.assignments.filter((a) => myTechIds.includes(a.technicianId) && a.active);
  const myReqs = db.requests.filter((r) => myAssigns.some((a) => a.requestId === r.id));

  return (
    <div className="grid gap-4 max-w-3xl mx-auto">
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
        <CardContent className="pt-5"><div className="font-extrabold text-lg">My jobs ({myReqs.length})</div><div className="text-white/80 text-xs">Technician PWA — works offline-first, installable. Accept, update status, log work, upload proof.</div></CardContent>
      </Card>
      {myReqs.length === 0 && <Card><CardContent className="pt-5 text-sm text-muted-foreground">No active jobs. Ops will assign you — watch notifications. (Demo: log in as Technician Tara, or open Ops → assign.)</CardContent></Card>}
      {myReqs.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex gap-2 items-center">{r.code} — {r.title}<Badge>{r.priority}</Badge><Badge variant="outline">{r.status}</Badge></CardTitle>
            <div className="text-xs text-muted-foreground">SLA {fmtDT(r.slaDeadline)}</div></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpen(r.id)}>Open detail</Button>
              {r.status === "ASSIGNED" && <Button size="sm" onClick={() => store.setStatus(r.id, "IN_PROGRESS", me.id)}>Accept & start</Button>}
              {r.status === "IN_PROGRESS" && <Button size="sm" onClick={() => store.setStatus(r.id, "PENDING_VERIFICATION", me.id)}>Mark done → verify</Button>}
              <Button size="sm" variant="destructive" onClick={() => { store.dropoutTech(r.id, me.id); }}>Mark unavailable (dropout)</Button>
            </div>
            <div className="flex gap-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log work…" /><Button size="sm" onClick={() => { if (note.trim()) { store.addLog(r.id, me.id, note, "NOTE"); setNote(""); } }}>Log</Button></div>
            <div className="flex gap-2"><Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="Completion photo URL" /><Button size="sm" variant="outline" onClick={() => { if (photo) { store.addAttachment(r.id, me.id, "field-photo", photo, "Completion proof"); setPhoto(""); } }}>Upload</Button></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
