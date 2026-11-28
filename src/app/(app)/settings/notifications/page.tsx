"use client";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { PageHead, Panel, Toggle } from "@/components/kit";
import { TelegramConnect } from "@/components/TelegramConnect";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Alerts the backend actually sends (App\Support\Alert): each goes to the bell (in-app, Web Push, realtime)
 * and to the seller's Telegram bot when connected. `ads` lives in settings.ads_guard.notify (also set on the Iklan page).
 */
const KINDS: { key: string; title: string; desc: string }[] = [
  { key: "daily_summary", title: "Ringkasan laba harian", desc: "Setiap pagi jam 07.00: omset & laba bersih kemarin, plus apa yang perlu dicek hari ini." },
  { key: "ship_deadline", title: "Pesanan hampir lewat batas kirim Shopee", desc: "Dicek tiap 30 menit, supaya tidak kena poin penalti keterlambatan." },
  { key: "ads", title: "Iklan Shopee merugi atau boros", desc: "Setelah sinkron iklan: iklan yang ROAS-nya di bawah titik impas atau belum menghasilkan penjualan." },
  { key: "restock", title: "SKU perlu restock", desc: "Setiap pagi jam 07.30: SKU yang habis atau akan habis sebelum stok baru datang." },
  { key: "missing_hpp", title: "Produk terjual tapi HPP belum diisi", desc: "Setiap Senin jam 09.00: produk yang laku minggu lalu tanpa HPP, supaya laba bersih tidak terlihat terlalu tinggi." },
  { key: "activation", title: "Panduan langkah awal", desc: "Untuk toko baru (2 minggu pertama): pengingat langkah awal yang belum selesai, misalnya hubungkan Shopee atau isi HPP." },
  { key: "reorder", title: "Pelanggan waktunya beli lagi", desc: "Setiap pagi jam 09.30: pembeli web/medsos yang sudah sebulan (atau sesuai siklusmu) belum pesan lagi." },
  { key: "money_check", title: "Dana Shopee perlu dicek / diklaim", desc: "Setiap pagi jam 08.30: dana tertahan, retur, atau kompensasi yang perlu ditindaklanjuti." },
];

export default function Notifications() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState<"telegram" | "kinds">("telegram");
  const [err, setErr] = useState("");
  const settings = ((user as any)?.settings ?? {}) as Record<string, any>;
  const notify: Record<string, boolean> = settings.notify ?? {};
  const adsGuard: Record<string, unknown> = settings.ads_guard ?? {};
  const isOn = (k: string) => (k === "ads" ? adsGuard.notify !== false : notify[k] !== false);

  const toggle = async (k: string, v: boolean) => {
    const body = k === "ads" ? { key: "ads_guard", value: { ...adsGuard, notify: v } } : { key: "notify", value: { ...notify, [k]: v } };
    setErr("");
    try {
      const next = await api("/user-settings", { method: "PUT", json: body });
      setUser({ ...user!, settings: next } as any);
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 403 ? "Hanya pemilik toko yang bisa mengubah pengaturan notifikasi." : e instanceof ApiError ? e.message : "Gagal menyimpan.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHead title="Notifikasi" />
      <Panel>
        <div className="m-3 grid grid-cols-2 rounded-lg bg-slate-50 p-1 text-sm">
          {([["telegram", "Telegram", Send], ["kinds", "Jenis Notifikasi", Bell]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 rounded-md py-2 ${tab === k ? "bg-white font-medium text-slate-800" : "text-slate-500"}`}><I size={16} />{l}</button>
          ))}
        </div>
        {tab === "telegram" ? (
          <div className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Send size={20} /></span>
              <div><b className="text-slate-800">Bot Telegram</b>
                <p className="text-sm text-slate-500">Semua notifikasi di tab <b>Jenis Notifikasi</b> juga dikirim ke Telegram ini, begitu juga PDF resi terjadwal (Pengaturan → Otomatisasi Pesanan). Cukup hubungkan sekali.</p></div>
            </div>
            <TelegramConnect />
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <p className="text-sm text-slate-600">Notifikasi masuk ke lonceng di kanan atas, ke HP/laptop jika notifikasi push diaktifkan dari lonceng, dan ke Telegram jika bot sudah terhubung.</p>
            {KINDS.map((k) => (
              <div key={k.key} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <div><b className="block font-medium text-slate-800">{k.title}</b><span className="text-xs text-slate-500">{k.desc}</span></div>
                <Toggle checked={isOn(k.key)} onChange={(v) => toggle(k.key, v)} />
              </div>
            ))}
            {err && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{err}</p>}
          </div>
        )}
      </Panel>
    </div>
  );
}
