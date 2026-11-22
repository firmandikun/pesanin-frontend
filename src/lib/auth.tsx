"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, getToken, setToken } from "./api";
import type { Member } from "./roles";
import type { SidebarMenuItem } from "./site";

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
  /** Seller sidebar items configured from Admin Console (/admin/settings). */
  sidebar?: SidebarMenuItem[];
  /** Pages of the other track (Marketplace vs Social & Web); blocked unless the add-on is active. */
  hidden_paths?: string[];
  plan_track?: "marketplace" | "social";
  plan_addon?: boolean;
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
    // Come back to this page after signing in (e.g. Daftar Toko right after authorising a Shopee shop).
    const toLogin = () => router.replace(loginPath === "/login" ? `/login?next=${encodeURIComponent(location.pathname + location.search)}` : loginPath);
    if (!getToken()) return toLogin();
    let alive = true;
    let wait = 2000;
    const check = () => api<User>("/me").then((u) => { if (alive) { setOffline(false); setUser(u); } }).catch((e) => {
      if (!alive) return;
      if (e instanceof ApiError && e.status === 401) return toLogin();
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f5f6fa] p-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-sm ring-1 ring-slate-200/70">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ee4d2d]/10">
            <span className="h-6 w-6 animate-spin rounded-full border-[2.5px] border-[#ee4d2d]/25 border-t-[#ee4d2d]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800">Pesanin</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {offline ? "Tidak bisa terhubung ke server Pesanin. Mencoba lagi…" : "Memuat akun & toko Anda…"}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
