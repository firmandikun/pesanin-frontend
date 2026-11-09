"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "./api";
import type { Member } from "./roles";

export type User = {
  id: number; name: string; store_name: string; store_slug: string; email: string; whatsapp?: string;
  bank_accounts?: { bank: string; number: string; holder: string }[] | null; cod_fee_percent: number;
  settings?: Record<string, any> | null;
  active_plan?: "gratis" | "starter" | "bisnis" | "pro";
  /** Set when a team member (not the owner) is signed in. */
  member?: Member | null;
};

const AuthContext = createContext<{ user: User | null; setUser: (u: User) => void; logout: () => void }>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    api<User>("/me").then(setUser).catch(() => router.replace("/login"));
  }, [router]);

  const logout = async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    router.replace("/login");
  };

  if (!user) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Memuat…</div>;
  }
  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
