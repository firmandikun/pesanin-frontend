"use client";
import { KeyRound, Landmark, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Field, Section } from "@/components/ui";

export default function Account() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user!.name, store_name: user!.store_name, store_slug: user!.store_slug, email: user!.email, whatsapp: user!.whatsapp ?? "" });
  const [banks, setBanks] = useState(user!.bank_accounts ?? []);
  const [codFee, setCodFee] = useState(String(user!.cod_fee_percent ?? 3));
  const [pw, setPw] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setErrors({}); setMsg("");
    try { setUser(await api("/me", { method: "PUT", json: { ...form, bank_accounts: banks, cod_fee_percent: Number(codFee) } })); setMsg("Pengaturan disimpan."); }
    catch (err) { if (err instanceof ApiError) setErrors(err.errors); }
  }
  async function savePassword(e: React.FormEvent) {
    e.preventDefault(); setErrors({}); setMsg("");
    try { await api("/me/password", { method: "PUT", json: pw }); setPw({ current_password: "", password: "", password_confirmation: "" }); setMsg("Password diganti."); }
    catch (err) { if (err instanceof ApiError) setErrors(err.errors); }
  }

  const input = (k: keyof typeof form, label: string, hint?: string) => (
    <Field label={label} error={errors[k]?.[0]} hint={hint}><input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="page-title">Account Settings</h1>
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
      <form onSubmit={saveProfile}>
        <Section title="Profil & Toko" icon={UserRound}>
          {input("name", "Nama")}
          {input("store_name", "Nama Toko")}
          {input("store_slug", "Slug Toko")}
          {input("email", "Email")}
          {input("whatsapp", "No. WhatsApp Toko", "Pembeli diarahkan ke nomor ini setelah checkout (template Redirect).")}
          <button className="btn-primary">Simpan</button>
        </Section>
        <div className="h-5" />
        <Section title="Pembayaran" icon={Landmark}>
          <div>
            <label className="label">Rekening Bank Transfer</label>
            <p className="mb-2 text-xs text-slate-500">Ditampilkan di halaman sukses & variabel {"{{bank_accounts}}"} pada template follow up.</p>
            {banks.map((b, i) => (
              <div key={i} className="mb-2 grid grid-cols-[100px_1fr_1fr_auto] gap-2">
                {(["bank", "number", "holder"] as const).map((k) => (
                  <input key={k} className="input" placeholder={{ bank: "Bank", number: "No. Rekening", holder: "Atas Nama" }[k]} value={b[k]}
                    onChange={(e) => setBanks(banks.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                ))}
                <button type="button" className="btn-outline" onClick={() => setBanks(banks.filter((_, j) => j !== i))} aria-label="Hapus"><Trash2 size={15} /></button>
              </div>
            ))}
            {errors["bank_accounts.0.number"] && <p className="text-xs text-red-600">Lengkapi data rekening.</p>}
            <button type="button" className="btn-ghost btn-sm text-brand-600" onClick={() => setBanks([...banks, { bank: "", number: "", holder: "" }])}><Plus size={14} />Tambah Rekening</button>
          </div>
          <Field label="Biaya COD (%)" hint="Dihitung dari (harga produk + ongkir) dan ditambahkan ke total pembeli COD." error={errors.cod_fee_percent?.[0]}>
            <input className="input w-32" type="number" step="0.1" min={0} max={10} value={codFee} onChange={(e) => setCodFee(e.target.value)} />
          </Field>
          <button className="btn-primary">Simpan</button>
        </Section>
      </form>
      <form onSubmit={savePassword}>
        <Section title="Ganti Password" icon={KeyRound}>
          {(["current_password", "password", "password_confirmation"] as const).map((k) => (
            <Field key={k} label={{ current_password: "Password Saat Ini", password: "Password Baru", password_confirmation: "Konfirmasi Password" }[k]} error={errors[k]?.[0]}>
              <input className="input" type="password" value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} />
            </Field>
          ))}
          <button className="btn-primary">Ganti Password</button>
        </Section>
      </form>
    </div>
  );
}
