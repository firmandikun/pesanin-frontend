"use client";

import { Bell, Lock, Mail, MessageCircle, PanelLeft, Save, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { FieldLabel, Panel, Toggle } from "@/components/kit";
import { api, ApiError } from "@/lib/api";
import type { SidebarMenuItem } from "@/lib/site";

type Site = {
  registration_open: boolean;
  notice: string | null;
  notice_tone: "info" | "warning" | "success";
  whatsapp: string | null;
  email: string | null;
};

const TONES = {
  info: "bg-sky-50 text-sky-800 border-sky-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
} as const;

/** Console → Pengaturan Platform: registration, seller sidebar visibility, notice banner, and support contacts. */
export default function PlatformSettings() {
  const [site, setSite] = useState<Site | null>(null);
  const [sidebar, setSidebar] = useState<SidebarMenuItem[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ site: Site; sidebar?: SidebarMenuItem[] }>("/admin/platform").then((d) => {
      setSite(d.site);
      setSidebar(d.sidebar ?? []);
    });
  }, []);

  if (!site) return <p className="py-24 text-center text-slate-400">Memuat pengaturan…</p>;
  const set = <K extends keyof Site>(k: K, v: Site[K]) => setSite({ ...site, [k]: v });

  const toggleMenu = async (key: string, visible: boolean) => {
    const nextSidebar = sidebar.map((m) => (m.key === key && !m.locked ? { ...m, visible } : m));
    setSidebar(nextSidebar);
    setMsg(null);
    try {
      const sidebarMap: Record<string, boolean> = {};
      nextSidebar.forEach((m) => {
        if (!m.locked) sidebarMap[m.key] = !!m.visible;
      });
      const d = await api<{ site: Site; sidebar?: SidebarMenuItem[] }>("/admin/platform", {
        method: "PUT",
        json: { sidebar: sidebarMap },
      });
      if (d.sidebar) setSidebar(d.sidebar);
      const target = nextSidebar.find((m) => m.key === key);
      setMsg({
        ok: true,
        text: `Menu "${target?.label ?? key}" berhasil ${visible ? "ditampilkan" : "disembunyikan"} di sidebar seller.`,
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan pengaturan sidebar" });
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const sidebarMap: Record<string, boolean> = {};
      sidebar.forEach((m) => {
        if (!m.locked) sidebarMap[m.key] = !!m.visible;
      });
      const d = await api<{ site: Site; sidebar?: SidebarMenuItem[] }>("/admin/platform", {
        method: "PUT",
        json: {
          site: { ...site, notice: site.notice?.trim() || null, whatsapp: site.whatsapp || null, email: site.email || null },
          sidebar: sidebarMap,
        },
      });
      setSite(d.site);
      if (d.sidebar) setSidebar(d.sidebar);
      setMsg({ ok: true, text: "Pengaturan platform & menu sidebar seller tersimpan." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pengaturan Platform</h1>
          <p className="text-sm text-slate-500">Berlaku untuk seluruh seller dan website Pesanin.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
      {msg && <p className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}

      <Panel className="flex items-start gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <UserPlus size={19} />
        </span>
        <div className="flex-1">
          <b className="text-slate-900">Pendaftaran akun baru</b>
          <p className="text-sm text-slate-500">
            Matikan sementara jika sedang maintenance atau masa beta tertutup. Seller yang sudah terdaftar tetap bisa login.
          </p>
        </div>
        <Toggle checked={site.registration_open} onChange={(v) => set("registration_open", v)} />
      </Panel>

      {/* Dynamic Seller Sidebar Visibility */}
      <Panel className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <PanelLeft size={19} />
          </span>
          <div>
            <b className="text-slate-900">Tampilan Menu Sidebar Seller</b>
            <p className="text-sm text-slate-500">
              Atur menu apa saja yang ditampilkan atau disembunyikan pada sidebar dashboard seller (dikirim langsung dari respons server).
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
          {sidebar.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm text-slate-900">{m.label}</b>
                  {m.badge && (
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {m.badge}
                    </span>
                  )}
                  {m.locked && (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      <Lock size={10} /> Wajib
                    </span>
                  )}
                </div>
                {m.description && <p className="mt-0.5 text-xs text-slate-500">{m.description}</p>}
              </div>
              {m.locked ? (
                <span className="text-xs font-semibold text-slate-400">Aktif</span>
              ) : (
                <Toggle checked={!!m.visible} onChange={(v) => toggleMenu(m.key, v)} />
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Bell size={19} />
          </span>
          <div>
            <b className="text-slate-900">Banner pemberitahuan</b>
            <p className="text-sm text-slate-500">
              Tampil di bagian atas dashboard semua seller, mis. jadwal maintenance atau gangguan Shopee.
            </p>
          </div>
        </div>
        <textarea
          rows={2}
          maxLength={300}
          className="input"
          placeholder="Kosongkan untuk menyembunyikan banner"
          value={site.notice ?? ""}
          onChange={(e) => set("notice", e.target.value)}
        />
        <div className="flex gap-2">
          {(Object.keys(TONES) as Site["notice_tone"][]).map((t) => (
            <button
              key={t}
              onClick={() => set("notice_tone", t)}
              className={`h-8 rounded-lg border px-3 text-xs font-semibold capitalize ${
                site.notice_tone === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
              }`}
            >
              {t === "info" ? "Info" : t === "warning" ? "Peringatan" : "Sukses"}
            </button>
          ))}
        </div>
        {site.notice?.trim() && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-400">Pratinjau</p>
            <div className={`rounded-lg border px-4 py-2.5 text-sm ${TONES[site.notice_tone]}`}>{site.notice}</div>
          </div>
        )}
      </Panel>

      <Panel className="space-y-4 p-5">
        <b className="text-slate-900">Kontak dukungan</b>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={14} />
                WhatsApp (format 62…)
              </span>
            </FieldLabel>
            <input
              className="input"
              placeholder="6281234567890"
              value={site.whatsapp ?? ""}
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5">
                <Mail size={14} />
                Email
              </span>
            </FieldLabel>
            <input
              type="email"
              className="input"
              placeholder="halo@pesaninn.my.id"
              value={site.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Dipakai tombol WhatsApp &ldquo;Perlu bantuan/konsultasi?&rdquo;, Jadwalkan Demo, dan footer website.
        </p>
      </Panel>
    </div>
  );
}
