import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_USERS, roleColor } from "@/lib/auth";
import { domainConfig } from "@/lib/domains";
import { AuthProvider, useAuth } from "@/services/auth";
import AuthGate from "@/components/auth/AuthGate";
import { useDB } from "@/services/store";
import OpsDashboard from "@/components/OpsDashboard";
import RequestDetail from "@/components/RequestDetail";
import CustomerPortal from "@/components/CustomerPortal";
import TechPWA from "@/components/TechPWA";
import AuditExplorer, { DemoControls } from "@/components/AuditAndDemo";
import { InventoryPanel, TechManage, NotifPanel, UsersPanel, ResetButton } from "@/components/Manage";
import { LayoutGrid, PlusCircle, Smartphone, Boxes, ShieldCheck, Bell, LogOut } from "lucide-react";
import type { Role } from "@/types";

type Tab = "ops" | "request" | "tech" | "inventory" | "audit";

const ROLE_TABS: Record<Role, Tab[]> = {
  OPS_MANAGER: ["ops", "request", "tech", "inventory", "audit"],
  ADMIN: ["ops", "request", "tech", "inventory", "audit"],
  TECHNICIAN: ["tech", "request"],
  CUSTOMER: ["request", "ops"],
};

const ROLE_DEFAULT_TAB: Record<Role, Tab> = {
  OPS_MANAGER: "ops",
  ADMIN: "ops",
  TECHNICIAN: "tech",
  CUSTOMER: "request",
};

function Shell() {
  const { user, logout, switchRole, can } = useAuth();
  const db = useDB();
  const [tab, setTab] = useState<Tab>("ops");
  const [openId, setOpenId] = useState<string | null>(null);

  // Resolve the store identity: demo directory ids match DB users;
  // arbitrary demo emails fall back to the role's canonical DB user so
  // createdBy / audit actor ids stay referentially consistent.
  const dbUser = db.users.find((u) => u.id === user?.id)
    ?? db.users.find((u) => u.role === user?.role)
    ?? db.users[1];
  const allowed = user ? ROLE_TABS[user.role] : [];
  const domainLabel = user ? domainConfig[user.domain].kicker : "";

  useEffect(() => {
    if (user) setTab(ROLE_DEFAULT_TAB[user.role]);
    setOpenId(null);
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user && !ROLE_TABS[user.role].includes(tab)) setTab(ROLE_DEFAULT_TAB[user.role]);
  }, [tab, user]);

  if (!user) return <AuthGate />;
  const open = (id: string) => { setOpenId(id); if (allowed.includes("request")) setTab("request"); };

  const tabs: { id: Tab; label: string; icon: any }[] = ([
    { id: "ops", label: user.role === "CUSTOMER" ? "Dashboard" : "Command center", icon: LayoutGrid },
    { id: "request", label: user.role === "CUSTOMER" ? "My requests" : user.role === "TECHNICIAN" ? "Jobs" : "Requests", icon: PlusCircle },
    { id: "tech", label: "Technician PWA", icon: Smartphone },
    { id: "inventory", label: "Inventory & team", icon: Boxes },
    { id: "audit", label: "Audit", icon: ShieldCheck },
  ] as { id: Tab; label: string; icon: any }[]).filter((t) => allowed.includes(t.id));

  const me = { ...dbUser, name: user.name, email: user.email, role: user.role, siteId: user.siteId ?? dbUser.siteId };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 py-2.5 flex flex-wrap gap-2 items-center">
          <div className="font-extrabold tracking-tight text-lg">◧ ServiceGrid <span className="text-xs font-medium text-muted-foreground hidden sm:inline">industrial servicing · multi-site</span></div>
          <nav className="flex gap-1 ml-2 flex-wrap">
            {tabs.map((t) => <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "ghost"} className="rounded-full" onClick={() => setTab(t.id)}><t.icon className="h-3.5 w-3.5" />{t.label}</Button>)}
          </nav>
          <div className="ml-auto flex gap-2 items-center">
            <span className="text-xs text-muted-foreground hidden md:inline flex items-center gap-1"><Bell className="h-3 w-3" />{db.notifications.length}</span>
            <span className="hidden lg:inline text-[11px] font-mono uppercase text-muted-foreground">{domainLabel}</span>
            {user.role === "ADMIN" && (
              <select
                aria-label="Switch role (admin demo)"
                value={dbUser.id}
                onChange={(e) => switchRole(e.target.value)}
                className="h-8 rounded-full border bg-background px-3 text-xs font-semibold"
                title="Switch role (admin demo)"
              >
                {DEMO_USERS.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
              </select>
            )}
            <span className="text-xs font-medium hidden sm:inline" title={user.email}>{user.name}</span>
            <Badge className={roleColor(me.role)}>{me.role}</Badge>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={logout} title="Sign out and return to domain selection">
              <LogOut className="h-3.5 w-3.5" />Logout
            </Button>
            <ResetButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-4 space-y-4">
        {can("demo:controls") && <DemoControls actorId={me.id} />}
        {tab === "ops" && <OpsDashboard actorId={me.id} onOpen={open} />}
        {tab === "request" && (openId
          ? <div className="space-y-2"><Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>← All requests</Button><RequestDetail requestId={openId} me={me} /></div>
          : <CustomerPortal me={me} onOpen={open} />)}
        {tab === "tech" && <TechPWA me={me} onOpen={open} />}
        {tab === "inventory" && <div className="grid lg:grid-cols-2 gap-4"><InventoryPanel /><div className="space-y-4"><TechManage /><UsersPanel /><NotifPanel /></div></div>}
        {tab === "audit" && <AuditExplorer />}
        <div className="text-center text-[11px] text-muted-foreground pt-2">ServiceGrid demo — EventBus + adapters + hash-chained audit · state machine enforced · data in localStorage · Next.js/Prisma deploy path in README</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
