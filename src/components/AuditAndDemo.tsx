import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { store, useDB, verifyChain } from "@/services/store";
import { fmtDT } from "@/lib/geo";
import { ShieldCheck } from "lucide-react";

export default function AuditExplorer() {
  const db = useDB();
  const [result, setResult] = useState<string>("");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Audit explorer — hash-chained ledger ({db.audit.length})</CardTitle>
        <div className="text-xs text-muted-foreground">Every state change, assignment & exception appends prevHash→hash. LedgerAdapter now; blockchain anchoring stubbed.</div></div>
        <Button size="sm" className="ml-auto" onClick={() => { const v = verifyChain(); setResult(v.ok ? `✓ Integrity verified — ${db.audit.length} entries, chain intact.` : `✗ BROKEN at index ${v.badIndex}`); }}>Verify integrity</Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {result && <div className={`text-xs rounded-lg p-2 ${result.startsWith("✓") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{result}</div>}
        <div className="max-h-[480px] overflow-auto space-y-1 font-mono text-[11px]">
          {[...db.audit].reverse().slice(0, 80).map((a) => (
            <div key={a.id} className="rounded-lg border p-2"><div className="flex gap-2 items-center flex-wrap"><Badge variant="outline">{a.action}</Badge><span>{a.entity}:{a.entityId.slice(0, 12)}</span><span className="ml-auto text-muted-foreground">{fmtDT(a.at)}</span></div>
              <div className="text-muted-foreground truncate">hash {a.hash} ← prev {a.prevHash} · actor {a.actor}</div></div>
          ))}
          {db.audit.length === 0 && <div className="font-sans text-sm text-muted-foreground">No entries yet — perform an action.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function DemoControls({ actorId }: { actorId: string }) {
  const db = useDB();
  const target = db.requests.find((r) => r.status !== "CLOSED") ?? db.requests[0];
  if (!target) return null;
  const btn = "text-xs";
  return (
    <Card className="border-violet-200 bg-violet-50/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm">🎛 Demo controls → real exception flow (target {target.code})</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" className={btn} onClick={() => store.dropoutTech(target.id, actorId)}>Simulate technician dropout</Button>
        <Button size="sm" variant="outline" className={btn} onClick={() => { try { store.depletePart(target.id, actorId); } catch (e: any) { alert(e.message); } }}>Deplete reserved part</Button>
        <Button size="sm" variant="outline" className={btn} onClick={() => store.fastForwardSLA(target.id, actorId)}>Fast-forward SLA clock</Button>
        <Button size="sm" variant="secondary" className={btn} onClick={() => store.iotAlert("M-104", actorId)}>Trigger IoT alert (P1)</Button>
        <Button size="sm" variant="ghost" className={btn} onClick={() => store.slaTick(actorId)}>Run SLA check now</Button>
      </CardContent>
    </Card>
  );
}
