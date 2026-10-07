import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { DOMAIN_ORDER, domainConfig, type DomainId } from "@/lib/domains";
import { useAuth } from "@/services/auth";
import "./auth.css";

function AuthBrand() {
  return (
    <div className="sg-topbar">
      <div className="sg-brand">SERVICEGRID<span className="sg-dot">.</span></div>
      <div className="sg-topmeta sg-mono">
        <span>RBAC Enabled</span>
        <span>JWT + Session</span>
        <span>Audit Logged</span>
        <span className="sg-live"><i />System / Online</span>
      </div>
    </div>
  );
}

function AuthIntro() {
  return (
    <div className="sg-intro">
      <div className="sg-kicker sg-mono">Secure Operations Fabric / 2026</div>
      <h1 className="sg-headline">Choose your <em>operational domain.</em></h1>
      <p className="sg-lede">
        Separate access portals keep dispatch, field execution, customer assets,
        and governance workflows isolated while sharing one service lifecycle.
      </p>
      <ul className="sg-meta sg-mono">
        <li><b>RBAC</b><span>Enabled</span></li>
        <li><b>Session</b><span>JWT + Refresh</span></li>
        <li><b>Audit</b><span>Logged</span></li>
      </ul>
    </div>
  );
}

function DomainCard({ id, index, onPick }: { id: DomainId; index: number; onPick: (d: DomainId) => void }) {
  const d = domainConfig[id];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(id); }
  };
  return (
    <button
      type="button"
      className="sg-domain"
      onClick={() => onPick(id)}
      onKeyDown={onKey}
      aria-label={`Select ${d.name} domain`}
    >
      <span className="sg-code sg-mono">Domain / {d.num}</span>
      <span>
        <span className="sg-name">{d.name}</span>
        <br />
        <span className="sg-short">{d.short}</span>
      </span>
      <span className="sg-arrow" aria-hidden="true">↗</span>
      <span style={{ display: "none" }}>{index}</span>
    </button>
  );
}

function DomainPicker({ onPick }: { onPick: (d: DomainId) => void }) {
  return (
    <div className="sg-fade">
      <div className="sg-panel-head">
        <span className="sg-panel-title sg-mono">Domain Selection</span>
        <span className="sg-panel-count sg-mono">04 Portals</span>
      </div>
      <div className="sg-domains" role="listbox" aria-label="Operational domains">
        {DOMAIN_ORDER.map((id, i) => (
          <DomainCard key={id} id={id} index={i} onPick={onPick} />
        ))}
      </div>
      <p className="sg-hint">Select a portal to continue. Access is scoped to your role after sign in.</p>
    </div>
  );
}

function DomainLogin({ domain, onBack }: { domain: DomainId; onBack: () => void }) {
  const cfg = domainConfig[domain];
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const fillDemo = () => {
    setEmail(cfg.demoEmail);
    setPassword("demo123");
    setLocalError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim()) { setLocalError("Enter a valid work email address."); return; }
    try {
      await login({ email: email.trim(), password, domain });
    } catch {
      /* error already in auth state */
    }
  };

  const shownError = localError ?? error;

  return (
    <div className="sg-login" key={domain}>
      <button type="button" className="sg-back" onClick={onBack}>← Domains</button>
      <div className="sg-code sg-mono">{cfg.code}</div>
      <div className="sg-kicker2 sg-mono">{cfg.kicker}</div>
      <h2>{cfg.title}</h2>
      <p className="sg-desc">{cfg.description}</p>
      {shownError && <div className="sg-error" role="alert">{shownError}</div>}
      <form onSubmit={submit} noValidate>
        <div className="sg-field">
          <label htmlFor="sg-email">Work email</label>
          <input
            id="sg-email"
            type="email"
            autoComplete="email"
            placeholder="operator@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="sg-field">
          <label htmlFor="sg-password">Password</label>
          <input
            id="sg-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />
        </div>
        <button type="submit" className="sg-submit" disabled={loading}>
          {loading ? "Authenticating…" : "Enter domain ↗"}
        </button>
      </form>
      <p className="sg-hint">
        Demo mode: any valid email + password opens the workspace.{" "}
        <button type="button" onClick={fillDemo}>Use {cfg.demoEmail} / demo123</button>
      </p>
    </div>
  );
}

export default function AuthGate() {
  const { selectedDomain, selectDomain } = useAuth();
  return (
    <div className="sg-gate">
      <AuthBrand />
      <div className="sg-main">
        <AuthIntro />
        <div className="sg-panel">
          {!selectedDomain
            ? <DomainPicker onPick={selectDomain} />
            : <DomainLogin domain={selectedDomain} onBack={() => selectDomain(null)} />}
        </div>
      </div>
      <div className="sg-foot sg-mono">
        <span>ServiceGrid · Industrial Operations Fabric</span>
        <span>Auth Gate / v2026.1</span>
      </div>
    </div>
  );
}
