"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, getToken, setToken } from "./api";
import type { Member } from "./roles";

export type User = {
  id: number; name: string; store_name: string; store_slug: string; email: string; whatsapp?: string;
  bank_accounts?: { bank: string; number: string; holder: string }[] | null; cod_fee_percent: number;
  settings?: Record<string, any> | null;
  active_plan?: "gratis" | "starter" | "bisnis" | "pro";
  plan_billing?: "monthly" | "yearly" | "trial" | null;
  subscription?: Subscription;
  /** Pesanin platform staff: can open /admin. */
  is_admin?: boolean;
  /** Set when a team member (not the owner) is signed in. */
  member?: Member | null;
};

/** See backend Plans::status(). */
export type Subscription = {
  status: "free" | "trial" | "active" | "grace" | "expired";
  plan: string; ends_at: string | null; days_left: number | null; grace_ends_at: string | null;
  reason?: "trial" | "paid";
};

const AuthContext = createContext<{ user: User | null; setUser: (u: User) => void; logout: () => void }>(null!);

export function AuthProvider({ children, loginPath = "/login" }: { children: React.ReactNode; loginPath?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [offline, setOffline] = useState(false);
  const router = useRouter();

  // Only a real "not signed in" (401) sends the user to the login page. A server restart during a deploy,
  // a 5xx or a dropped connection keeps the session and retries instead of asking to sign in again.
  useEffect(() => {
    if (!getToken()) return router.replace(loginPath);
    let alive = true;
    let wait = 2000;
    const check = () => api<User>("/me").then((u) => { if (alive) { setOffline(false); setUser(u); } }).catch((e) => {
      if (!alive) return;
      if (e instanceof ApiError && e.status === 401) return router.replace(loginPath);
      setOffline(true);
      setTimeout(check, wait);
      wait = Math.min(wait * 2, 30000);
    });
    check();
    return () => { alive = false; };
  }, [router, loginPath]);

  const logout = async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    router.replace(loginPath);
  };

  if (!user) {
    return <div className="flex h-screen items-center justify-center text-sm text-slate-400">{offline ? "Tidak bisa terhubung ke server Pesanin. Mencoba lagi…" : "Memuat…"}</div>;
  }
  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
