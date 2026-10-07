import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { store, useDB } from "@/services/store";
import { can } from "@/lib/stateMachine";
import { fmtDT } from "@/lib/geo";
import type { AppUser } from "@/types";

export default function RequestDetail({ requestId, me }: { requestId: string; me: AppUser }) {
  const db = useDB();
  const r = db.requests.find((x) => x.id === requestId);
  const [note, setNote] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  if (!r) return <div className="text-sm text-muted-foreground">Request not found.</div>;
  const machine = db.machines.find((m) => m.id === r.machineId);
  const ranked = store.rank(r.id);
  const assigns = db.assignments.filter((a) => a.requestId === r.id);
  const logs = db.logs.filter((l) => l.requestId === r.id);
  const res = db.reservations.filter((x) => x.requestId === r.id);
  const atts = db.attachments.filter((a) => a.requestId === r.id);
  const audit = db.audit.filter((a) => a.entityId === r.id || a.entityId.startsWith("a_") && assigns.some((x) => x.id === a.entityId));

  const set = (to: typeof r.status) => { try { store.setStatus(r.id, to, me.id); } catch (e: any) { alert(e.message); } };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex flex-wrap gap-2 items-center">{r.code} — {r.title}<Badge variant={r.priority === "P1" ? "destructive" : "secondary"}>{r.priority}</Badge><Badge variant="outline">{r.status}</Badge></CardTitle>
            <div className="text-xs text-muted-foreground">{machine?.code} {machine?.name} • {db.sites.find((s) => s.id === r.siteId)?.name} • SLA {fmtDT(r.slaDeadline)}</div></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{r.description}</p>
            <div className="flex flex-wrap gap-2">
              {can(me.role, "request:approve") && r.status === "PENDING_APPROVAL" && <Button size="sm" onClick={() => store.approve(r.id, me.id)}>Approve</Button>}
              {can(me.role, "request:assign") && (r.status === "APPROVED" || r.status === "EXCEPTION") && ranked[0] && (
                <Button size="sm" onClick={() => { try { store.assign(r.id, ranked[0].tech.id, me.id); } catch (e: any) { alert(e.message); } }}>Assign {ranked[0].tech.name} ({ranked[0].breakdown.total})</Button>
              )}
              {r.status === "ASSIGNED" && <Button size="sm" onClick={() => set("IN_PROGRESS")}>Start work</Button>}
              {r.status === "IN_PROGRESS" && <Button size="sm" onClick={() => set("PENDING_VERIFICATION")}>Submit for verification</Button>}
              {can(me.role, "request:verify") && r.status === "PENDING_VERIFICATION" && <Button size="sm" onClick={() => set("CLOSED")}>Verify & close</Button>}
            </div>
            {(r.status === "PENDING_VERIFICATION" || r.status === "IN_PROGRESS") && (me.role === "TECHNICIAN" || me.role === "OPS_MANAGER") && (
              <div className="flex gap-2">
                <Input placeholder="Completion photo URL (or any image link)" value={photoNote} onChange={(e) => setPhotoNote(e.target.value)} />
                <Button size="sm" variant="outline" onClick={() => { if (photoNote) { store.addAttachment(r.id, me.id, "completion-photo", photoNote, "Completion proof"); setPhotoNote(""); } }}>Upload proof</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-sm">Validation report</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">{r.validationReport?.checks.map((c, i) => (
            <div key={i} className="text-xs flex gap-2 items-start"><Badge variant={c.result === "pass" ? "secondary" : c.result === "warn" ? "outline" : "destructive"}>{c.result}</Badge><span><b>{c.name}:</b> {c.message}</span></div>
          ))}<div className="text-xs text-muted-foreground">Overall: {r.validationReport?.overall}</div></CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Allocation scoreboard (0.4 skill · 0.25 proximity · 0.2 availability · 0.15 workload)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">{ranked.slice(0, 3).map(({ tech, breakdown }, i) => (
            <div key={tech.id} className="text-xs rounded-lg border p-2 flex flex-wrap gap-2 items-center">
              <b>#{i + 1} {tech.name}</b><Badge variant="secondary">{breakdown.total}</Badge>
              <span className="text-muted-foreground">skill {breakdown.skillMatch} · prox {breakdown.proximity} · avail {breakdown.availability} · load {breakdown.workload}</span>
              {can(me.role, "request:assign") && <Button size="sm" variant="outline" className="ml-auto" onClick={() => { try { store.assign(r.id, tech.id, me.id); } catch (e: any) { alert(e.message); } }}>Assign</Button>}
            </div>
          ))}{assigns.map((a) => <div key={a.id} className="text-xs text-muted-foreground">✔ {db.techs.find((t) => t.id === a.technicianId)?.name} — {a.explanation} {!a.active && "(superseded)"}</div>)}</CardContent></Card>

        <Card><CardHeader><CardTitle className="text-sm">Parts reservation (atomic, no oversell)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">{res.length === 0 && <span className="text-muted-foreground">No reservations yet.</span>}{res.map((x) => <div key={x.id}>{x.sku} ×{x.qty} from {x.siteId}</div>)}
            <div className="text-muted-foreground pt-1">Required: {r.requiredParts.map((p) => `${p.sku}×${p.qty}`).join(", ") || "—"}</div></CardContent></Card>
      </div>

      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-sm">Timeline / task log</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log work note…" className="text-sm" /><Button size="sm" onClick={() => { if (note.trim()) { store.addLog(r.id, me.id, note); setNote(""); } }}>Add</Button></div>
            {logs.map((l) => <div key={l.id} className="text-xs rounded-lg bg-muted/60 p-2"><b>{l.authorName}</b> <span className="text-muted-foreground">{fmtDT(l.at)} · {l.kind}</span><div>{l.text}</div></div>)}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Attachments</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">{atts.length === 0 && <span className="text-muted-foreground">No attachments.</span>}{atts.map((a) => <a key={a.id} href={a.url} target="_blank" className="block rounded-lg border p-2 hover:border-primary">📎 {a.name} — {a.note}<div className="text-muted-foreground truncate">{a.url}</div></a>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Audit trail (hash-chained)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-[11px] font-mono">{audit.slice(0, 12).map((a) => <div key={a.id} className="truncate">{a.hash.slice(0, 8)} ← {a.prevHash.slice(0, 8)} · {a.action} · {a.actor}</div>)}{audit.length === 0 && <span className="font-sans text-xs text-muted-foreground">Entries appear after actions.</span>}</CardContent></Card>
      </div>
    </div>
  );
}
