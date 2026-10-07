import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { store, useDB } from "@/services/store";

export function InventoryPanel() {
  const db = useDB();
  return (
    <Card><CardHeader><CardTitle className="text-sm">Part inventory — {db.parts.length} SKUs across {db.sites.length} sites (qty / reserved)</CardTitle></CardHeader>
      <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[560px] overflow-auto">
        {db.parts.map((p) => {
          const free = p.qty - p.reservedQty;
          return <div key={p.id} className="rounded-xl border p-2.5 text-xs"><div className="flex gap-2 items-center"><b>{p.sku}</b><Badge variant={free <= 0 ? "destructive" : free < 3 ? "outline" : "secondary"}>{free} free</Badge><span className="ml-auto text-muted-foreground">{p.siteId}</span></div><div className="text-muted-foreground">{p.name} • stock {p.qty} / res {p.reservedQty}</div></div>;
        })}
      </CardContent></Card>
  );
}

export function TechManage() {
  const db = useDB();
  return (
    <Card><CardHeader><CardTitle className="text-sm">Technicians — skills, availability, load</CardTitle></CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-2">
        {db.techs.map((t) => (
          <div key={t.id} className="rounded-xl border p-3 text-xs">
            <div className="flex gap-2 items-center"><b className="text-sm">{t.name}</b><Badge variant={t.online ? "secondary" : "destructive"}>{t.online ? "online" : "offline"}</Badge><span className="ml-auto text-muted-foreground">{t.siteId}</span></div>
            <div className="mt-1 flex flex-wrap gap-1">{t.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
            <div className="text-muted-foreground mt-1">availability {t.availability} • load {t.currentLoad} • {t.certifications.join(", ")}</div>
          </div>
        ))}
      </CardContent></Card>
  );
}

export function NotifPanel() {
  const db = useDB();
  return (
    <Card><CardHeader><CardTitle className="text-sm">Notifications ({db.notifications.length})</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 max-h-[300px] overflow-auto text-xs">
        {db.notifications.slice(0, 30).map((n) => <div key={n.id} className="rounded-lg bg-muted/60 p-2"><b>{n.title}</b><div className="text-muted-foreground">{n.body}</div></div>)}
      </CardContent></Card>
  );
}

export function UsersPanel() {
  const db = useDB();
  return (
    <Card><CardHeader><CardTitle className="text-sm">Users & roles (RBAC enforced)</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 text-xs">{db.users.map((u) => <div key={u.id} className="rounded-lg border p-2 flex gap-2 items-center"><b>{u.name}</b><Badge variant="outline">{u.role}</Badge><span className="text-muted-foreground ml-auto">{u.email}</span></div>)}</CardContent></Card>
  );
}

export function ResetButton() {
  return <Button variant="outline" size="sm" onClick={() => { if (confirm("Reset demo data?")) store.reset(); }}>Reset demo</Button>;
}
