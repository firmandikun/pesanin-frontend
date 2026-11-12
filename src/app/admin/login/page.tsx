"use client";

import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { api, ApiError, setToken } from "@/lib/api";

/** Sign-in for Pesanin staff. Seller accounts are turned away here and use /login. */
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api<{ token: string; user: { is_admin?: boolean; member?: unknown } }>("/login", { method: "POST", json: { email, password } });
      if (!res.user?.is_admin || res.user.member) {
        setToken(res.token);
        await api("/logout", { method: "POST" }).catch(() => {});
        setToken(null);
        setError("Akun ini bukan admin Pesanin. Seller masuk lewat halaman login biasa.");
        return;
      }
      setToken(res.token);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors.email?.[0] ?? err.message) : "Gagal masuk");
    } finally { setLoading(false); }
  };

  return (
    <div className="console flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_60%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <LogoMark size={40} />
          <div className="leading-tight"><b className="block text-lg text-white">Pesanin</b><span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Console</span></div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><ShieldCheck size={17} className="text-indigo-400" />Masuk sebagai admin</div>
          {error && <p className="rounded-lg bg-rose-500/10 p-2.5 text-sm text-rose-300">{error}</p>}
          <label className="block text-xs font-semibold text-slate-400">Email
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-indigo-400" />
          </label>
          <label className="block text-xs font-semibold text-slate-400">Password
            <span className="relative mt-1.5 block">
              <input type={show ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 pr-10 text-sm text-white outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Tampilkan password">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
          </label>
          <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-60">{loading && <Loader2 size={16} className="animate-spin" />}Masuk ke Console</button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">Seller? <a href="/login" className="font-semibold text-slate-300 hover:text-white">Masuk ke dashboard toko</a></p>
      </div>
    </div>
  );
}
