"use client";
import { AlertTriangle, ChevronDown, Loader2, Pause, Play, Settings2, ShieldCheck, Target, TrendingDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Status = "rugi" | "tanpa_penjualan" | "tipis" | "hpp_kosong" | "sehat" | "data_kurang";
type Row = {
  id: number; campaign_id: number; shop_id: number; name: string; ad_type: string | null; bidding_method: string | null; roas_target: number | null;
  expense: number; gmv: number; orders: number; roas: number | null; fee_rate: number; hpp_ratio: number | null;
  break_even: number | null; break_even_min: number; suggested_target: number | null; profit: number | null; status: Status; editable: boolean;
  items: { item_id: number; name: string | null; image: string | null; price: number; hpp: number | null }[];
};
type Settings = { notify: boolean; days: number; min_spend: number; action: "off" | "pause" | "raise_target" };
type Data = { days: number; settings: Settings; campaigns: Row[]; summary: Record<Status, number> & { loss: number; wasted: number } };

const META: Record<Status, [string, string]> = {
  rugi: ["Rugi", "bg-rose-50 text-rose-700 ring-rose-200"],
  tanpa_penjualan: ["Tanpa penjualan", "bg-rose-50 text-rose-700 ring-rose-200"],
  tipis: ["Untung tipis", "bg-amber-50 text-amber-700 ring-amber-200"],
  hpp_kosong: ["HPP belum diisi", "bg-slate-100 text-slate-600 ring-slate-200"],
  sehat: ["Sehat", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  data_kurang: ["Data belum cukup", "bg-slate-50 text-slate-500 ring-slate-200"],
};

/**
 * Penjaga Iklan: each Shopee ad against ITS break-even ROAS (from HPP + the shop's real Shopee fees), so the seller
 * sees which ads lose money and can pause them or raise their ROAS target in one click.
 */
export function AdsGuardPanel({ shopId }: { shopId?: string }) {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState("");
  const [cfgOpen, setCfgOpen] = useState(false);

  const load = useCallback(() => { api<Data>(`/marketplace/ads/guard?days=${days}`).then(setD).catch(() => setD(null)); }, [days]);
  useEffect(load, [load]);

  const act = async (r: Row, action: "pause" | "resume" | "change_roas_target", target?: number | null) => {
    setBusy(`${r.id}${action}`);
    try {
      const res = await api<{ status: string; roas_target: number | null }>(`/marketplace/ads/guard/${r.id}`, { method: "POST", json: { action, target } });
      // A paused ad leaves the list (only running ads are judged); a new target shows right away.
      setD((cur) => cur && { ...cur, campaigns: res.status === "paused" ? cur.campaigns.filter((x) => x.id !== r.id) : cur.campaigns.map((x) => (x.id === r.id ? { ...x, roas_target: res.roas_target } : x)) });
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal mengubah iklan", "Gagal"); } finally { setBusy(""); }
  };

  const rows = (d?.campaigns ?? []).filter((r) => !shopId || String(r.shop_id) === shopId);
  const alerting = rows.filter((r) => r.status === "rugi" || r.status === "tanpa_penjualan");
  const visible = showAll ? rows : rows.filter((r) => r.status !== "data_kurang" && r.status !== "sehat");
  const s = d?.summary;

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-left">
          <ShieldCheck size={18} className={alerting.length ? "text-rose-600" : "text-emerald-600"} />
          <span>
            <b className="block text-sm text-navy">Penjaga Iklan</b>
            <span className="block text-xs text-slate-500">
              {!d ? "Menghitung titik impas tiap iklan…"
                : alerting.length ? `${alerting.length} iklan merugi ${d.days} hari terakhir${s?.loss || s?.wasted ? ` · rugi ±${rupiah(Math.abs(s.loss) + s.wasted)}` : ""}`
                : "Tidak ada iklan yang merugi"}
            </span>
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="flex items-center gap-2">
          <Select className="input h-9 w-36 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[3, 7, 14, 30].map((n) => <option key={n} value={n}>{n} hari terakhir</option>)}
          </Select>
          <button onClick={() => setCfgOpen(!cfgOpen)} className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${cfgOpen ? "border-[#ee4d2d] text-[#ee4d2d]" : "border-slate-200 text-slate-600"}`}><Settings2 size={15} />Atur</button>
        </div>
      </div>

      {cfgOpen && d && <GuardSettings value={d.settings} onSaved={(v) => { setD({ ...d, settings: v }); setCfgOpen(false); load(); }} />}

      {open && (
        <div className="px-4 py-3">
          {!d ? <p className="flex items-center gap-2 py-4 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat…</p> : (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
                {(Object.keys(META) as Status[]).map((k) => [k, rows.filter((r) => r.status === k).length] as const).filter(([, n]) => n > 0).map(([k, n]) => (
                  <span key={k} className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${META[k][1]}`}>{META[k][0]} {n}</span>
                ))}
              </div>
              {!visible.length ? (
                <p className="py-3 text-sm text-slate-500">Semua iklan aktif di atas titik impas{rows.some((r) => r.status === "data_kurang") ? " (iklan dengan biaya kecil belum dinilai)" : ""}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="text-left text-xs text-slate-500"><tr>
                      {["Iklan", "Status", "Biaya iklan", "ROAS", "Titik impas", "Laba/rugi iklan", ""].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {visible.map((r) => {
                        const img = r.items[0]?.image;
                        return (
                          <tr key={r.id} className="border-t border-slate-100 align-top">
                            <td className="px-2 py-2.5">
                              <div className="flex items-center gap-2.5">
                                {img ? <img src={img} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <span className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" />}
                                <span className="min-w-0"><b className="block max-w-[240px] truncate text-navy" title={r.name}>{r.name}</b>
                                  <span className="block text-[11px] text-slate-400">{r.orders} pesanan · target ROAS {r.roas_target ?? "-"}</span></span>
                              </div>
                            </td>
                            <td className="px-2 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${META[r.status][1]}`}>{META[r.status][0]}</span></td>
                            <td className="whitespace-nowrap px-2 py-2.5 font-medium text-navy">{rupiah(r.expense)}</td>
                            <td className={`px-2 py-2.5 font-bold ${r.status === "rugi" || r.status === "tanpa_penjualan" ? "text-rose-600" : r.status === "tipis" ? "text-amber-600" : "text-navy"}`}>{r.roas ?? "-"}</td>
                            <td className="px-2 py-2.5">
                              {r.break_even ? <b className="text-navy">{r.break_even}</b> : r.status === "hpp_kosong" ? <span className="text-xs text-slate-500">≥ {r.break_even_min}<span className="block">isi HPP dulu</span></span> : <span className="text-xs text-rose-600">rugi sebelum iklan</span>}
                              <span className="block text-[11px] text-slate-400">biaya Shopee {Math.round(r.fee_rate * 100)}%{r.hpp_ratio !== null ? ` · HPP ${Math.round(r.hpp_ratio * 100)}%` : ""}</span>
                            </td>
                            <td className={`whitespace-nowrap px-2 py-2.5 font-semibold ${r.profit === null ? "text-slate-400" : r.profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              {r.status === "tanpa_penjualan" ? `−${rupiah(r.expense)}` : r.profit === null ? "-" : `${r.profit < 0 ? "−" : "+"}${rupiah(Math.abs(r.profit))}`}
                            </td>
                            <td className="px-2 py-2.5">
                              {r.editable ? (
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  {r.status === "rugi" && r.bidding_method === "auto" && r.suggested_target && (r.roas_target ?? 0) < r.suggested_target && (
                                    <button onClick={() => act(r, "change_roas_target", r.suggested_target)} disabled={!!busy} title={`Target ROAS ${r.suggested_target} = titik impas + 20% margin aman`}
                                      className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-navy hover:border-[#ee4d2d] hover:text-[#ee4d2d] disabled:opacity-50">
                                      {busy === `${r.id}change_roas_target` ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}Target {r.suggested_target}
                                    </button>
                                  )}
                                  {(r.status === "rugi" || r.status === "tanpa_penjualan" || r.status === "tipis") && (
                                    <button onClick={() => act(r, "pause")} disabled={!!busy}
                                      className="flex h-8 items-center gap-1 rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                                      {busy === `${r.id}pause` ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />}Jeda
                                    </button>
                                  )}
                                </div>
                              ) : <span className="block text-right text-[11px] text-slate-400">Iklan otomatis toko, atur di Seller Centre</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><TrendingDown size={13} />Titik impas = 1 ÷ (1 − biaya Shopee − HPP/harga). ROAS di bawahnya berarti iklan menghabiskan lebih dari laba produk.</span>
                <button onClick={() => setShowAll(!showAll)} className="font-semibold text-[#ee4d2d]">{showAll ? "Sembunyikan yang sehat" : `Tampilkan semua (${rows.length})`}</button>
              </div>
              {s && s.hpp_kosong > 0 && <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{s.hpp_kosong} iklan belum bisa dinilai karena HPP produknya kosong. Isi lewat Semua Produk → Input HPP massal.</p>}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

function GuardSettings({ value, onSaved }: { value: Settings; onSaved: (v: Settings) => void }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api("/user-settings", { method: "PUT", json: { key: "ads_guard", value: v } }); onSaved(v); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal menyimpan", "Gagal"); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex items-start justify-between gap-3 lg:col-span-1">
        <span><b className="block text-navy">Kirim peringatan</b><span className="text-xs text-slate-500">Notifikasi + Telegram, maks. sekali sehari per iklan, setelah data iklan disinkron (tiap 3 jam).</span></span>
        <Toggle checked={v.notify} onChange={(x) => setV({ ...v, notify: x })} />
      </label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Dinilai dari</span>
        <Select className="input h-9" value={v.days} onChange={(e) => setV({ ...v, days: Number(e.target.value) })}>{[3, 7, 14].map((n) => <option key={n} value={n}>{n} hari terakhir</option>)}</Select></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Minimal biaya iklan untuk dinilai</span>
        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span><input type="number" min={10000} step={10000} className="input h-9 pl-9" value={v.min_spend} onChange={(e) => setV({ ...v, min_spend: Number(e.target.value) })} /></div></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Tindakan otomatis</span>
        <Select className="input h-9" value={v.action} onChange={(e) => setV({ ...v, action: e.target.value as Settings["action"] })}>
          <option value="off">Hanya peringatan</option>
          <option value="raise_target">Naikkan target ROAS (iklan ROAS otomatis), jeda sisanya</option>
          <option value="pause">Jeda iklan yang merugi</option>
        </Select></label>
      <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
        <p className="flex items-center gap-1.5 text-xs text-slate-500">{v.action !== "off" ? <><Play size={12} />Pesanin akan mengubah iklan di Shopee secara otomatis untuk iklan yang rugi / tanpa penjualan.</> : "Pesanin tidak mengubah iklan apa pun tanpa Anda klik."}</p>
        <button onClick={save} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}Simpan</button>
      </div>
    </div>
  );
}
