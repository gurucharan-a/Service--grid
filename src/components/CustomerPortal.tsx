import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { store, useDB } from "@/services/store";
import { createRequestSchema } from "@/lib/schemas";
import { aiAdapter } from "@/adapters/impl";
import { Sparkles } from "lucide-react";
import type { AppUser, Priority } from "@/types";

export default function CustomerPortal({ me, onOpen }: { me: AppUser; onOpen: (id: string) => void }) {
  const db = useDB();
  const [machineId, setMachineId] = useState("m-104");
  const [title, setTitle] = useState("Conveyor C-4 halted — motor trip suspected");
  const [desc, setDesc] = useState("Line C-4 stopped mid-shift near MCC-2. Burning smell, drive overload trip. Need urgent attendance.");
  const [priority, setPriority] = useState<Priority>("P1");
  const [parts, setParts] = useState("BELT-V88:2, FUSE-10A:4");
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState("");
  const mine = db.requests.filter((r) => r.createdBy === me.id || me.role !== "CUSTOMER");

  const aiAssist = async () => {
    setAiBusy(true);
    try {
      const out = await aiAdapter.parseComplaint(desc);
      setTitle(out.title);
      setPriority(out.priority);
      if (out.parts?.length) setParts(out.parts.map((p) => `${p.sku}:${p.qty}`).join(", "));
      const m = db.machines.find((x) => x.code === out.machineCodeGuess);
      if (m) setMachineId(m.id);
    } finally { setAiBusy(false); }
  };

  const submit = () => {
    setErr("");
    const requiredParts = parts.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const [sku, q] = s.split(":").map((x) => x.trim());
      return { sku, qty: Number(q) || 1 };
    });
    const parsed = createRequestSchema.safeParse({ machineId, title, description: desc, priority, requiredParts });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    const r = store.createRequest({ ...parsed.data, priority: parsed.data.priority as Priority }, me.id);
    onOpen(r.id);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Create service request</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Machine</Label><select className="mt-1 w-full rounded-xl border bg-background h-9 px-3 text-sm" value={machineId} onChange={(e) => setMachineId(e.target.value)}>{db.machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.eligible ? "eligible" : "INELIGIBLE"})</option>)}</select></div>
          <div><Label>Free-text complaint (AI assist)</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
            <Button size="sm" variant="secondary" className="mt-2" onClick={aiAssist} disabled={aiBusy}><Sparkles className="h-3.5 w-3.5" />{aiBusy ? "Parsing…" : "AI parse (Claude + fallback)"}</Button></div>
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priority</Label><select className="mt-1 w-full rounded-xl border bg-background h-9 px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{["P1", "P2", "P3", "P4"].map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><Label>Parts (SKU:qty,…)</Label><Input value={parts} onChange={(e) => setParts(e.target.value)} /></div>
          </div>
          {err && <div className="text-xs text-red-600">{err}</div>}
          <Button onClick={submit}>Submit request</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Track status ({mine.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[520px] overflow-auto">
          {mine.map((r) => (
            <button key={r.id} onClick={() => onOpen(r.id)} className="w-full text-left rounded-xl border p-3 hover:border-primary">
              <div className="flex gap-2 items-center text-xs"><Badge variant={r.priority === "P1" ? "destructive" : "secondary"}>{r.priority}</Badge><Badge variant="outline">{r.status}</Badge><span className="ml-auto text-muted-foreground">{r.code}</span></div>
              <div className="text-sm font-semibold mt-1">{r.title}</div>
            </button>
          ))}
          {mine.length === 0 && <div className="text-sm text-muted-foreground">No requests yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
