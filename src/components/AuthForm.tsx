"use client";
import { AlertCircle, ArrowRight, Eye, EyeOff, Gift } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, setToken } from "@/lib/api";
import type { User } from "@/lib/auth";
import { GoogleButton, googleEnabled } from "./GoogleButton";

type FieldDef = { name: string; label: string; type?: string; placeholder?: string; auto?: string; half?: boolean; optional?: boolean };

const LOGIN: FieldDef[] = [
  { name: "email", label: "Alamat email", type: "email", placeholder: "nama@email.com", auto: "email" },
  { name: "password", label: "Kata sandi", type: "password", placeholder: "Masukkan kata sandi", auto: "current-password" },
];
const REGISTER: FieldDef[] = [
  { name: "name", label: "Nama lengkap", placeholder: "Rina Kartika", auto: "name", half: true },
  { name: "store_name", label: "Nama toko / bisnis", placeholder: "Rina Beauty", half: true },
  { name: "email", label: "Alamat email", type: "email", placeholder: "nama@email.com", auto: "email" },
  { name: "whatsapp", label: "No. WhatsApp", placeholder: "08xxxxxxxxxx", auto: "tel", optional: true },
  { name: "password", label: "Kata sandi", type: "password", placeholder: "Minimal 8 karakter", auto: "new-password" },
];

/** Where a freshly signed-in account should land. */
export function landingFor(user: Partial<User> | undefined, fallback = "/dashboard") {
  if (user?.is_admin && !user.member) return "/admin";
  if (user?.subscription?.status === "expired") return "/langganan";
  return fallback;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const login = mode === "login";
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [general, setGeneral] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const fields = login ? LOGIN : REGISTER;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!login && !agree) { setGeneral("Centang persetujuan Syarat Layanan dan Kebijakan Privasi dulu."); return; }
    setLoading(true); setErrors({}); setGeneral("");
    try {
      const res = await api<{ token: string; user?: User }>(`/${mode}`, { method: "POST", json: form });
      setToken(res.token);
      router.replace(landingFor(res.user, login ? "/dashboard" : "/products/new"));
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.errors).length) setErrors(err.errors);
        else setGeneral(err.message);
      } else setGeneral("Tidak bisa terhubung ke server Pesanin. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function google(credential: string) {
    setLoading(true); setErrors({}); setGeneral("");
    try {
      const res = await api<{ token: string; user?: User; created?: boolean }>("/auth/google", { method: "POST", json: { credential } });
      setToken(res.token);
      router.replace(landingFor(res.user, res.created ? "/products/new" : "/dashboard"));
    } catch (err) {
      setGeneral(err instanceof ApiError ? (err.errors.email?.[0] ?? err.message) : "Tidak bisa terhubung ke server Pesanin. Periksa koneksi lalu coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
      <form onSubmit={submit} className="px-6 pb-7 pt-8 sm:px-9">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">{login ? "Masuk ke akun Anda" : "Buat akun baru"}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{login ? "Selamat datang kembali! Silakan masuk untuk melanjutkan" : "Selamat datang! Isi data Anda untuk mulai"}</p>
        </div>

        {!login && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm ring-1 ring-brand-100">
            <Gift size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-slate-700"><b className="text-navy">Coba gratis 7 hari</b> dengan semua fitur paket Bisnis. Tanpa kartu kredit, tidak ada tagihan otomatis.</p>
          </div>
        )}

        {googleEnabled && (
          <div className="mt-6">
            <GoogleButton text={login ? "continue_with" : "signup_with"} onCredential={google} disabled={loading} />
            <div className="mt-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau<span className="h-px flex-1 bg-slate-200" /></div>
          </div>
        )}

        {general && <p className="mt-6 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{general}</p>}

        <div className={`mt-6 grid gap-4 ${login ? "" : "sm:grid-cols-2"}`}>
          {fields.map((f) => {
            const err = errors[f.name]?.[0];
            return (
              <label key={f.name} className={`block ${f.half ? "" : "sm:col-span-2"}`}>
                <span className="mb-1.5 flex justify-between text-sm font-semibold text-slate-700">{f.label}{f.optional && <span className="font-normal text-slate-400">Opsional</span>}</span>
                <span className="relative block">
                  <input
                    className={`h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] text-navy outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 ${f.type === "password" ? "pr-11" : ""} ${err ? "border-rose-400" : "border-slate-200"}`}
                    type={f.type === "password" && show ? "text" : f.type ?? "text"}
                    placeholder={f.placeholder}
                    autoComplete={f.auto}
                    required={!f.optional}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                  {f.type === "password" && (
                    <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-navy" aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </span>
                {err && <span className="mt-1.5 block text-xs text-rose-600">{err}</span>}
              </label>
            );
          })}
        </div>

        {!login && (
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
            <span>Saya setuju dengan <Link href="/terms-of-service" target="_blank" className="font-semibold text-brand-600 hover:underline">Syarat Layanan</Link> dan <Link href="/privacy-policy" target="_blank" className="font-semibold text-brand-600 hover:underline">Kebijakan Privasi</Link></span>
          </label>
        )}

        <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-sm font-bold text-white shadow-md shadow-brand-600/25 ring-1 ring-brand-700/40 transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-60" disabled={loading}>
          {loading ? "Memproses…" : <>Lanjutkan<ArrowRight size={16} /></>}
        </button>

        {login && process.env.NODE_ENV !== "production" && (
          <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">Akun lokal: <b className="text-slate-700">pengguna1@pesanin.test</b> / password123</p>
        )}
      </form>
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-sm text-slate-600">
        {login
          ? <>Belum punya akun? <Link href="/register" className="font-semibold text-brand-600 hover:underline">Daftar</Link></>
          : <>Sudah punya akun? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Masuk</Link></>}
      </div>
    </div>
  );
}
