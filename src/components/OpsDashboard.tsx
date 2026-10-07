import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSSE } from "@/lib/sse";
import { store, useDB } from "@/services/store";
import { slaElapsedRatio, fmtDT } from "@/lib/geo";
import MapView from "./MapView";
import { AlertTriangle, Radio, Wrench, Clock, Zap } from "lucide-react";

export default function OpsDashboard({ actorId, onOpen }: { actorId: string; onOpen: (id: string) => void }) {
  const db = useDB();
  const { events, connected } = useSSE();

  const kpi = useMemo(() => {
    const open = db.requests.filter((r) => r.status !== "CLOSED").length;
    const atRisk = db.requests.filter((r) => r.status !== "CLOSED" && slaElapsedRatio(r.createdAt, r.slaDeadline) >= 0.8).length;
    const exc = db.exceptions.filter((e) => !e.resolved).length;
    const util = db.techs.length ? Math.round((db.techs.reduce((s, t) => s + t.currentLoad, 0) / db.techs.length) * 100) : 0;
    return { open, atRisk, exc, util };
  }, [db]);

  const openExc = db.exceptions.filter((e) => !e.resolved);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Open requests", v: kpi.open, icon: <Wrench className="h-4 w-4" />, cls: "text-sky-600" },
          { label: "SLA at risk", v: kpi.atRisk, icon: <Clock className="h-4 w-4" />, cls: "text-amber-600" },
          { label: "Exceptions", v: kpi.exc, icon: <AlertTriangle className="h-4 w-4" />, cls: "text-red-600" },
          { label: "Utilization", v: kpi.util + "%", icon: <Zap className="h-4 w-4" />, cls: "text-violet-600" },
        ].map((k) => (
          <Card key={k.label}><CardContent className="pt-4"><div className={`flex items-center gap-2 text-xs font-semibold ${k.cls}`}>{k.icon}{k.label.toUpperCase()}</div><div className="text-3xl font-extrabold mt-1">{k.v}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><MapView sites={db.sites} techs={db.techs} requests={db.requests} /></div>
        <Card className="flex flex-col max-h-[400px]">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />Live activity (SSE · EventBus)</CardTitle></CardHeader>
          <CardContent className="overflow-auto text-xs space-y-2 flex-1">
            {events.length === 0 && <div className="text-muted-foreground">Waiting for events — approve, assign or trigger a demo control.</div>}
            {events.slice(0, 25).map((e, i) => (
              <div key={i} className="rounded-lg bg-muted/60 px-2.5 py-1.5 flex gap-2 items-start">
                <Radio className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                <div><span className="font-semibold">{e.name}</span> <span className="text-muted-foreground">{fmtDT(e.at)}</span><div className="text-muted-foreground truncate max-w-[260px]">{JSON.stringify(e.payload)}</div></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Exception panel — one-click reassign</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {openExc.length === 0 && <div className="text-sm text-muted-foreground">No open exceptions. Use Demo controls to simulate dropout / part shortage / SLA breach.</div>}
          {openExc.map((ex) => {
            const r = db.requests.find((x) => x.id === ex.requestId);
            const cand = db.techs.find((t) => t.id === ex.candidateId);
            return (
              <div key={ex.id} className="rounded-xl border bg-red-50/50 p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex-1 text-sm">
                  <div className="flex gap-2 items-center flex-wrap"><Badge variant="destructive">{ex.type}</Badge><button className="font-bold underline" onClick={() => r && onOpen(r.id)}>{r?.code}</button><span className="text-xs text-muted-foreground">{fmtDT(ex.createdAt)}</span></div>
                  <div className="mt-1">{ex.message}</div>
                  {ex.suggestion && <div className="text-xs text-muted-foreground mt-1">💡 {ex.suggestion}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {cand && r && <Button size="sm" onClick={() => { store.reassign(r.id, actorId); store.resolveException(ex.id, actorId); }}>One-click reassign → {cand.name}</Button>}
                  <Button size="sm" variant="outline" onClick={() => store.resolveException(ex.id, actorId)}>Resolve</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Active requests</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {db.requests.map((r) => (
            <button key={r.id} onClick={() => onOpen(r.id)} className="text-left rounded-xl border p-3 hover:border-primary transition-colors">
              <div className="flex gap-2 items-center"><Badge variant={r.priority === "P1" ? "destructive" : "secondary"}>{r.priority}</Badge><Badge variant="outline">{r.status}</Badge><span className="ml-auto text-xs text-muted-foreground">{r.code}</span></div>
              <div className="font-semibold text-sm mt-1.5 line-clamp-1">{r.title}</div>
              <div className="text-xs text-muted-foreground">SLA {fmtDT(r.slaDeadline)} • {Math.round(slaElapsedRatio(r.createdAt, r.slaDeadline) * 100)}% elapsed</div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
