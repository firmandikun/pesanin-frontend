"use client";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, setToken } from "@/lib/api";
import { Field } from "./ui";

type FieldDef = { name: string; label: string; type?: string; placeholder?: string; auto?: string };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const fields: FieldDef[] = mode === "login"
    ? [{ name: "email", label: "Email", type: "email", placeholder: "nama@toko.com", auto: "email" }, { name: "password", label: "Password", type: "password", auto: "current-password" }]
    : [
        { name: "name", label: "Nama lengkap", auto: "name" },
        { name: "store_name", label: "Nama toko / bisnis", placeholder: "Contoh: Toko Rina Skincare" },
        { name: "email", label: "Email", type: "email", placeholder: "nama@toko.com", auto: "email" },
        { name: "whatsapp", label: "No. WhatsApp", placeholder: "08xxxxxxxxxx", auto: "tel" },
        { name: "password", label: "Password", type: "password", placeholder: "Minimal 8 karakter", auto: "new-password" },
      ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await api<{ token: string }>(`/${mode}`, { method: "POST", json: form });
      setToken(res.token);
      router.replace(mode === "register" ? "/products/new" : "/dashboard");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors.email || Object.keys(err.errors).length ? err.errors : { email: [err.message] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1 className="text-[28px] font-extrabold tracking-tight text-navy">{mode === "login" ? "Masuk" : "Buat akun Pesanin"}</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        {mode === "login" ? "Lanjutkan kelola pesanan tokomu." : "Gratis untuk mulai. Tidak perlu kartu kredit."}
      </p>

      <div className={`mt-8 ${mode === "register" ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}`}>
        {fields.map((f) => (
          <div key={f.name} className={mode === "register" && !["name", "store_name"].includes(f.name) ? "sm:col-span-2" : ""}>
            <Field label={f.label} error={errors[f.name]?.[0]}>
              <div className="relative">
                <input
                  className={`input h-11 ${f.type === "password" ? "pr-11" : ""} ${errors[f.name] ? "border-rose-400" : ""}`}
                  type={f.type === "password" && show ? "text" : f.type ?? "text"}
                  placeholder={f.placeholder}
                  autoComplete={f.auto}
                  required={f.name !== "whatsapp"}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
                {f.type === "password" && (
                  <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-navy" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            </Field>
          </div>
        ))}
      </div>

      <button className="mt-6 h-11 w-full rounded-xl bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60" disabled={loading}>
        {loading ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar gratis"}
      </button>

      {mode === "register" && <p className="mt-3 text-xs leading-relaxed text-slate-500">Dengan mendaftar, kamu menyetujui Syarat Layanan dan Kebijakan Privasi Pesanin.</p>}

      <p className="mt-8 text-sm text-slate-600">
        {mode === "login"
          ? <>Belum punya akun? <Link href="/register" className="font-semibold text-brand-600 hover:underline">Daftar gratis</Link></>
          : <>Sudah punya akun? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Masuk</Link></>}
      </p>
      {mode === "login" && process.env.NODE_ENV !== "production" && (
        <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Akun demo lokal: <b className="text-slate-700">demo@pesanin.test</b> / password</p>
      )}
    </form>
  );
}
