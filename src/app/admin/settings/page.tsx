"use client";

import { Bell, Mail, MessageCircle, Save, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { FieldLabel, Panel, Toggle } from "@/components/kit";
import { api, ApiError } from "@/lib/api";

type Site = { registration_open: boolean; notice: string | null; notice_tone: "info" | "warning" | "success"; whatsapp: string | null; email: string | null };
const TONES = { info: "bg-sky-50 text-sky-800 border-sky-200", warning: "bg-amber-50 text-amber-900 border-amber-200", success: "bg-emerald-50 text-emerald-800 border-emerald-200" } as const;

/** Console → Pengaturan Platform: registration, the banner shown to every seller, and support contacts. */
export default function PlatformSettings() {
  const [site, setSite] = useState<Site | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api<{ site: Site }>("/admin/platform").then((d) => setSite(d.site)); }, []);
  if (!site) return <p className="py-24 text-center text-slate-400">Memuat pengaturan…</p>;
  const set = <K extends keyof Site>(k: K, v: Site[K]) => setSite({ ...site, [k]: v });

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const d = await api<{ site: Site }>("/admin/platform", { method: "PUT", json: { site: { ...site, notice: site.notice?.trim() || null, whatsapp: site.whatsapp || null, email: site.email || null } } });
      setSite(d.site); setMsg({ ok: true, text: "Pengaturan platform tersimpan." });
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Pengaturan Platform</h1><p className="text-sm text-slate-500">Berlaku untuk seluruh seller dan website Pesanin.</p></div>
        <button onClick={save} disabled={saving} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? "Menyimpan…" : "Simpan"}</button>
      </div>
      {msg && <p className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}

      <Panel className="flex items-start gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UserPlus size={19} /></span>
        <div className="flex-1"><b className="text-slate-900">Pendaftaran akun baru</b><p className="text-sm text-slate-500">Matikan sementara jika sedang maintenance atau masa beta tertutup. Seller yang sudah terdaftar tetap bisa login.</p></div>
        <Toggle checked={site.registration_open} onChange={(v) => set("registration_open", v)} />
      </Panel>

      <Panel className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Bell size={19} /></span>
          <div><b className="text-slate-900">Banner pemberitahuan</b><p className="text-sm text-slate-500">Tampil di bagian atas dashboard semua seller, mis. jadwal maintenance atau gangguan Shopee.</p></div>
        </div>
        <textarea rows={2} maxLength={300} className="input" placeholder="Kosongkan untuk menyembunyikan banner" value={site.notice ?? ""} onChange={(e) => set("notice", e.target.value)} />
        <div className="flex gap-2">{(Object.keys(TONES) as Site["notice_tone"][]).map((t) => <button key={t} onClick={() => set("notice_tone", t)} className={`h-8 rounded-lg border px-3 text-xs font-semibold capitalize ${site.notice_tone === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}>{t === "info" ? "Info" : t === "warning" ? "Peringatan" : "Sukses"}</button>)}</div>
        {site.notice?.trim() && <div><p className="mb-1 text-xs font-semibold text-slate-400">Pratinjau</p><div className={`rounded-lg border px-4 py-2.5 text-sm ${TONES[site.notice_tone]}`}>{site.notice}</div></div>}
      </Panel>

      <Panel className="space-y-4 p-5">
        <b className="text-slate-900">Kontak dukungan</b>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel><span className="flex items-center gap-1.5"><MessageCircle size={14} />WhatsApp (format 62…)</span></FieldLabel><input className="input" placeholder="6281234567890" value={site.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} /></div>
          <div><FieldLabel><span className="flex items-center gap-1.5"><Mail size={14} />Email</span></FieldLabel><input type="email" className="input" placeholder="halo@pesaninn.my.id" value={site.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
        </div>
        <p className="text-xs text-slate-500">Dipakai tombol WhatsApp “Perlu bantuan/konsultasi?”, Jadwalkan Demo, dan footer website.</p>
      </Panel>
    </div>
  );
}
