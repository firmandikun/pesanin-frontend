"use client";
import { AlertTriangle, ChevronDown, Loader2, Pause, Play, Settings2, ShieldCheck, Stethoscope, Target, TrendingDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { showAlert } from "@/components/Dialogs";
import { Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { Modal } from "@/components/ui";
import { api, ApiError, rupiah } from "@/lib/api";

type Status = "rugi" | "tanpa_penjualan" | "tipis" | "hpp_kosong" | "sehat" | "data_kurang";
type Row = {
  id: number; campaign_id: number; shop_id: number; name: string; ad_type: string | null; bidding_method: string | null; roas_target: number | null;
  expense: number; expense_real: number; gmv: number; orders: number; roas: number | null; roas_real: number | null; fee_rate: number; hpp_ratio: number | null;
  impressions: number; clicks: number; ctr: number | null; cr: number | null; cpc: number | null; cost_per_order: number | null;
  evaluation: Verdict[]; hpp_total: number | null; fee_total: number;
  break_even: number | null; break_even_min: number; suggested_target: number | null; profit: number | null; status: Status; editable: boolean;
  items: { item_id: number; name: string | null; image: string | null; price: number; hpp: number | null }[];
};
type Verdict = { key: "hook" | "conversion" | "profit"; title: string; status: string; tone: "good" | "ok" | "bad" | "wait"; desc: string };
type Settings = { notify: boolean; days: number; min_spend: number; action: "off" | "pause" | "raise_target" };
type Data = { days: number; from?: string; to?: string; settings: Settings; campaigns: Row[]; summary: Record<Status, number> & { loss: number; wasted: number } };

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
export function AdsGuardPanel({ shopId, range, reloadKey = 0 }: { shopId?: string; range?: { from: string; to: string }; reloadKey?: number }) {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState("");
  const [cfgOpen, setCfgOpen] = useState(false);
  const [evalRow, setEvalRow] = useState<Row | null>(null);

  // Follows the ads page's date filter when given; otherwise its own "N hari terakhir".
  const load = useCallback(() => {
    const qs = range ? `from=${range.from}&to=${range.to}` : `days=${days}`;
    api<Data>(`/marketplace/ads/guard?${qs}`).then(setD).catch(() => setD(null));
  }, [days, range?.from, range?.to]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load, reloadKey]);

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
                : alerting.length ? `${alerting.length} iklan merugi ${range ? "di periode ini" : `${d.days} hari terakhir`}${s?.loss || s?.wasted ? ` · rugi ±${rupiah(Math.abs(s.loss) + s.wasted)}` : ""}`
                : "Tidak ada iklan yang merugi"}
            </span>
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="flex items-center gap-2">
          {range ? <span className="text-xs text-slate-500">Periode {range.from === range.to ? range.from : `${range.from} s/d ${range.to}`}</span> : (
            <Select className="input h-9 w-36 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[3, 7, 14, 30].map((n) => <option key={n} value={n}>{n} hari terakhir</option>)}
            </Select>
          )}
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
                      {["Iklan", "Status", "Biaya iklan (+PPN)", "ROAS riil", "Titik impas", "Laba/rugi iklan", ""].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}
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
                            <td className="whitespace-nowrap px-2 py-2.5 font-medium text-navy">{rupiah(r.expense_real)}<span className="block text-[11px] font-normal text-slate-400">Shopee {rupiah(r.expense)}</span></td>
                            <td className={`px-2 py-2.5 font-bold ${r.status === "rugi" || r.status === "tanpa_penjualan" ? "text-rose-600" : r.status === "tipis" ? "text-amber-600" : "text-navy"}`}>{r.roas_real ?? "-"}<span className="block text-[11px] font-normal text-slate-400">Shopee {r.roas ?? "-"} · CTR {r.ctr ?? "-"}% · CR {r.cr ?? "-"}%</span></td>
                            <td className="px-2 py-2.5">
                              {r.break_even ? <b className="text-navy">{r.break_even}</b> : r.status === "hpp_kosong" ? <span className="text-xs text-slate-500">≥ {r.break_even_min}<span className="block">isi HPP dulu</span></span> : <span className="text-xs text-rose-600">rugi sebelum iklan</span>}
                              <span className="block text-[11px] text-slate-400">biaya Shopee {Math.round(r.fee_rate * 100)}%{r.hpp_ratio !== null ? ` · HPP ${Math.round(r.hpp_ratio * 100)}%` : ""}</span>
                            </td>
                            <td className={`whitespace-nowrap px-2 py-2.5 font-semibold ${r.profit === null ? "text-slate-400" : r.profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              {r.status === "tanpa_penjualan" ? `−${rupiah(r.expense_real)}` : r.profit === null ? "-" : `${r.profit < 0 ? "−" : "+"}${rupiah(Math.abs(r.profit))}`}
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <button onClick={() => setEvalRow(r)} className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-navy hover:border-[#ee4d2d] hover:text-[#ee4d2d]"><Stethoscope size={13} />Evaluasi</button>
                              {r.editable ? (
                                <>
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
                                </>
                              ) : <span className="block w-full text-right text-[11px] text-slate-400">Iklan otomatis toko, atur di Seller Centre</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><TrendingDown size={13} />Titik impas = 1 ÷ (1 − biaya Shopee − HPP/harga). ROAS riil = penjualan ÷ (biaya iklan + PPN 11%); di bawah titik impas berarti iklan menghabiskan lebih dari laba produk.</span>
                <button onClick={() => setShowAll(!showAll)} className="font-semibold text-[#ee4d2d]">{showAll ? "Sembunyikan yang sehat" : `Tampilkan semua (${rows.length})`}</button>
              </div>
              {s && s.hpp_kosong > 0 && <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{s.hpp_kosong} iklan belum bisa dinilai karena HPP produknya kosong. Isi lewat Semua Produk → Input HPP massal.</p>}
            </>
          )}
        </div>
      )}
      <EvaluationModal row={evalRow} days={d?.days ?? days} onClose={() => setEvalRow(null)} />
    </Panel>
  );
}

const TONE: Record<Verdict["tone"], string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700", ok: "border-indigo-200 bg-indigo-50 text-indigo-700",
  bad: "border-rose-200 bg-rose-50 text-rose-700", wait: "border-slate-200 bg-slate-50 text-slate-600",
};

/** Evaluasi iklan: Hook (CTR), Konversi (CR), ROAS & laba, each with what to do next. */
function EvaluationModal({ row: r, days, onClose }: { row: Row | null; days: number; onClose: () => void }) {
  const num = (n: number) => n.toLocaleString("id-ID");
  const dec = (n: number | null, unit: string) => (n === null ? "-" : `${n.toLocaleString("id-ID")}${unit}`);
  const stats: [string, string][] = r ? [
    ["Tayangan", num(r.impressions)], ["Klik", num(r.clicks)], ["CTR", dec(r.ctr, "%")], ["CR", dec(r.cr, "%")],
    ["Pesanan", num(r.orders)], ["Penjualan", rupiah(r.gmv)], ["Biaya riil (+PPN)", rupiah(r.expense_real)], ["Biaya / pesanan", r.cost_per_order ? rupiah(r.cost_per_order) : "-"],
    ["Biaya / klik", r.cpc ? rupiah(r.cpc) : "-"], ["ROAS riil", dec(r.roas_real, "x")], ["Titik impas", dec(r.break_even, "x")],
    ["Laba/rugi", r.profit === null ? "-" : `${r.profit < 0 ? "−" : "+"}${rupiah(Math.abs(r.profit))}`],
  ] : [];
  return (
    <Modal open={!!r} onClose={onClose} title="Evaluasi Iklan" icon={Stethoscope} wide>
      {r && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {r.items[0]?.image ? <img src={r.items[0].image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-slate-100" />}
            <div className="min-w-0"><b className="block truncate text-navy">{r.name}</b><span className="text-xs text-slate-500">{days} hari terakhir · {META[r.status][0]}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-[11px] text-slate-500">{k}</span><b className={`text-sm ${k === "Laba/rugi" && r.profit !== null ? (r.profit < 0 ? "text-rose-600" : "text-emerald-600") : "text-navy"}`}>{v}</b></div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <b className="text-sm text-navy">Perhitungan laba / rugi iklan</b>
            <dl className="mt-2 space-y-1.5 text-[13px]">
              {([
                ["Penjualan dari iklan", r.gmv, ""],
                [`Total HPP produk terjual${r.hpp_ratio !== null ? ` (${Math.round(r.hpp_ratio * 100)}% dari harga)` : ""}`, r.hpp_total, "−"],
                [`Potongan Shopee (${Math.round(r.fee_rate * 100)}%)`, r.fee_total, "−"],
                ["Biaya iklan riil (+PPN 11%)", r.expense_real, "−"],
              ] as const).map(([l, v, sign]) => (
                <div key={l} className="flex justify-between gap-3"><dt className="text-slate-500">{l}</dt>
                  <dd className="font-medium text-navy">{v === null ? <span className="text-xs text-amber-600">HPP belum diisi</span> : `${sign}${rupiah(v)}`}</dd></div>
              ))}
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5"><dt className="font-semibold text-navy">Laba / rugi bersih iklan</dt>
                <dd className={`font-bold ${r.profit === null ? "text-slate-400" : r.profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>{r.profit === null ? "Isi HPP dulu" : `${r.profit < 0 ? "−" : "+"}${rupiah(Math.abs(r.profit))}`}</dd></div>
            </dl>
            {r.hpp_total === null && <p className="mt-2 text-[11px] text-amber-700">Isi HPP produk ini di Semua Produk → Input HPP Massal agar laba/rugi bisa dihitung.</p>}
          </div>
          {r.evaluation.map((v, i) => (
            <div key={v.key} className={`rounded-xl border p-3.5 ${TONE[v.tone]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-sm text-navy">{i + 1}. {v.title}</b>
                <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold">{v.status}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{v.desc}</p>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">Standar: CTR rendah &lt; 1,5%, tinggi ≥ 3% · CR rendah &lt; 2,5%, tinggi ≥ 5% · biaya iklan riil = biaya Shopee + PPN 11%.</p>
        </div>
      )}
    </Modal>
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
