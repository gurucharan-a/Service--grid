import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "@/types";
import { domainConfig, type DomainId } from "@/lib/domains";
import { DEMO_USERS } from "@/lib/auth";
import { can as canAction } from "@/lib/stateMachine";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  domain: DomainId;
  siteId?: string;
}

interface LoginInput {
  email: string;
  password: string;
  domain: DomainId;
}

interface AuthState {
  selectedDomain: DomainId | null;
  isAuthenticated: boolean;
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  selectDomain: (d: DomainId | null) => void;
  login: (input: LoginInput) => Promise<SessionUser>;
  logout: () => void;
  switchRole: (userId: string) => void;
  can: (action: string) => boolean;
  requireDomain: (domain: DomainId) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "servicegrid_auth_v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Demo directory: spec credentials + legacy grid.io personas. Any other
// syntactically valid email also works (demo mode) and is mapped to the
// selected domain's role so the flow can be evaluated end-to-end.
const DEMO_DIRECTORY: Record<string, { name: string; role: Role; id: string; siteId?: string }> = {
  "operator@servicegrid.demo": { name: "Operations Operator", role: "OPS_MANAGER", id: "u-ops" },
  "tech@servicegrid.demo": { name: "Field Technician", role: "TECHNICIAN", id: "u-tech" },
  "customer@servicegrid.demo": { name: "Site Customer", role: "CUSTOMER", id: "u-cust", siteId: "site-a" },
  "admin@servicegrid.demo": { name: "Platform Administrator", role: "ADMIN", id: "u-admin" },
};

for (const u of DEMO_USERS) {
  DEMO_DIRECTORY[u.email.toLowerCase()] = { name: u.name, role: u.role, id: u.id, siteId: u.siteId };
}

/**
 * Authentication abstraction. Demo implementation resolves locally;
 * production swaps this body for `POST /api/v1/auth/login` returning a
 * JWT + refresh pair while keeping the same signature.
 */
export async function login({ email, password, domain }: LoginInput): Promise<SessionUser> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) throw new Error("Enter a valid work email address.");
  if (!password || password.length < 4) throw new Error("Password must be at least 4 characters.");
  if (!domainConfig[domain]) throw new Error("Select an operational domain first.");

  // Simulated network latency so loading states are visible.
  await new Promise((r) => setTimeout(r, 650));

  const expectedRole = domainConfig[domain].role;
  const known = DEMO_DIRECTORY[clean];
  // Demo mode: any valid email + password opens the workspace under the
  // selected domain's role. Known demo emails keep their display names.
  const user: SessionUser = {
    id: known?.id ?? `u-${domain}-${clean.replace(/[^a-z0-9]/g, "").slice(0, 12)}`,
    email: clean,
    name: known?.name ?? clean.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    role: known && known.role === expectedRole ? known.role : expectedRole,
    domain,
    siteId: known?.siteId,
  };
  return user;
}

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as SessionUser;
    if (!u?.email || !u?.role || !u?.domain || !domainConfig[u.domain]) return null;
    return u;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (s) {
      setUser(s);
      setSelectedDomain(s.domain);
    }
    setRestored(true);
  }, []);

  const persist = (u: SessionUser | null) => {
    try {
      if (!u) {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
      }
    } catch { /* storage unavailable — keep in-memory session */ }
  };

  const doLogin = useCallback(async (input: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      const u = await login(input);
      setUser(u);
      setSelectedDomain(u.domain);
      persist(u);
      return u;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Authentication failed.";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    setSelectedDomain(null);
    persist(null);
  }, []);

  // Admin-only demo convenience: switch persona without re-typing credentials.
  // Backend RBAC still enforced per request via `can()` / route guards.
  const switchRole = useCallback((userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (!found) return;
    const domain = (Object.keys(domainConfig) as DomainId[]).find((d) => domainConfig[d].role === found.role) ?? "governance";
    const u: SessionUser = { id: found.id, email: found.email, name: found.name, role: found.role, domain, siteId: found.siteId };
    setUser(u);
    setSelectedDomain(domain);
    persist(u);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    selectedDomain,
    isAuthenticated: !!user,
    user,
    loading,
    error,
    selectDomain: (d) => { setSelectedDomain(d); setError(null); },
    login: doLogin,
    logout,
    switchRole,
    can: (action: string) => (user ? canAction(user.role, action) : false),
    requireDomain: (domain: DomainId) => !!user && user.domain === domain,
  }), [selectedDomain, user, loading, error, doLogin, logout, switchRole]);

  if (!restored) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
