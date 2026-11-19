"use client";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, HeartPulse, Loader2, Package, RefreshCcw, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError } from "@/lib/api";

type Metric = { id: number; parent_id: number; name: string; current: number | null; last: number | null; unit: string; target: string | null; ok: boolean | null };
type Health = {
  shop: { id: number; name: string }; checked_at: string; errors: Record<string, string>;
  overall: { rating: number; label: string; failed: Record<string, number> } | null;
  metrics: { type: string; metrics: Metric[] }[];
  penalty: { total: number; records: { id: string; at: string | null; points: number; original: number; reason: string }[] };
  late_orders: { order_sn: string; deadline: string | null; late_days: number; order_id: number | null; buyer: string | null; status: string | null }[];
  listings: { item_id: number; reason: string; name: string; image: string | null }[];
};

const TONE: Record<number, string> = { 1: "bg-rose-600", 2: "bg-amber-500", 3: "bg-emerald-500", 4: "bg-emerald-600" };
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
const fmt = (v: number | null, unit: string) => (v === null || v === undefined ? "-" : `${Number.isInteger(v) ? v : Number(v).toFixed(2)}${unit}`);

/** Marketplace → Kesehatan Akun: Shopee account health per shop. */
export default function HealthPage() {
  const [d, setD] = useState<Health[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shop, setShop] = useState("");
  const load = useCallback((fresh = false) => {
    setBusy(true); setErr("");
    api<{ shops: Health[] }>(`/marketplace/health${fresh ? "?fresh=1" : ""}`).then((r) => setD(r.shops))
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat kesehatan akun")).finally(() => setBusy(false));
  }, []);
  useEffect(() => load(), [load]);
  const shown = shop ? d?.filter((h) => String(h.shop.id) === shop) : d && d.length > 1 ? [] : d;
  const tone = (h: Health) => (h.overall ? (h.overall.rating < 3 ? "⚠ " : "") : "");

  return (
    <div className="space-y-5">
      <PageHead title="Kesehatan Akun" tutorial={false} crumbs={[["Marketplace"], ["Kesehatan Akun"]]}>
        {d && d.length > 1 && (
          <Select className="input h-10 w-56" value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">Semua toko ({d.length})</option>
            {d.map((h) => <option key={h.shop.id} value={h.shop.id}>{tone(h)}{h.shop.name}{h.overall ? ` · ${h.overall.label}` : ""}</option>)}
          </Select>
        )}
        <button onClick={() => load(true)} disabled={busy} className="flex h-10 items-center gap-2 rounded-lg bg-[#ee4d2d] px-4 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Cek ulang
        </button>
      </PageHead>
      <p className="text-sm text-slate-500">Diambil langsung dari Shopee (diperbarui tiap 30 menit). Setiap pagi Pesanin mengirim peringatan kalau ada poin penalti baru, pesanan terlambat, atau performa toko turun.</p>
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      {!d && !err && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Mengambil data dari Shopee…</p>}
      {d && !d.length && <Panel className="p-8 text-center text-sm text-slate-500">Belum ada toko Shopee aktif. <Link href="/marketplace/shops" className="font-semibold text-[#ee4d2d]">Hubungkan toko</Link></Panel>}
      {d && d.length > 1 && !shop && <Summary shops={d} onPick={(id) => setShop(String(id))} />}
      {shop && d && d.length > 1 && <button onClick={() => setShop("")} className="text-sm font-semibold text-[#ee4d2d]">← Semua toko</button>}
      {shown?.map((h) => <ShopHealth key={h.shop.id} h={h} />)}
    </div>
  );
}

/** Multi-shop overview: one row per shop, worst first, click to focus that shop. */
function Summary({ shops, onPick }: { shops: Health[]; onPick: (id: number) => void }) {
  const score = (h: Health) => (h.overall?.rating ?? 5) * 100 - h.penalty.total * 10 - h.late_orders.length - h.listings.length;
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr className="text-left text-xs text-slate-400"><th className="px-4 py-3 font-medium">Toko</th><th className="px-3 py-3 font-medium">Performa</th><th className="px-3 py-3 text-right font-medium">Poin penalti</th><th className="px-3 py-3 text-right font-medium">Terlambat</th><th className="px-3 py-3 text-right font-medium">Listing bermasalah</th><th className="px-4 py-3" /></tr></thead>
        <tbody>
          {[...shops].sort((a, b) => score(a) - score(b)).map((h) => (
            <tr key={h.shop.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => onPick(h.shop.id)}>
              <td className="px-4 py-2.5 font-semibold text-navy">{h.shop.name}</td>
              <td className="px-3 py-2.5">{h.overall ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${TONE[h.overall.rating] ?? "bg-slate-400"}`}>{h.overall.label}</span> : <span className="text-xs text-slate-400">-</span>}</td>
              <td className={`px-3 py-2.5 text-right font-semibold ${h.penalty.total ? "text-rose-600" : "text-slate-500"}`}>{h.penalty.total}</td>
              <td className={`px-3 py-2.5 text-right font-semibold ${h.late_orders.length ? "text-amber-600" : "text-slate-500"}`}>{h.late_orders.length}</td>
              <td className={`px-3 py-2.5 text-right font-semibold ${h.listings.length ? "text-rose-600" : "text-slate-500"}`}>{h.listings.length}</td>
              <td className="px-4 py-2.5 text-right text-xs font-semibold text-[#ee4d2d]">{Object.keys(h.errors).length ? <span className="mr-2 text-amber-600">data sebagian</span> : null}Lihat</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ShopHealth({ h }: { h: Health }) {
  const failed = h.metrics.flatMap((g) => g.metrics).filter((m) => m.ok === false);
  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShopeeMark size={28} />
            <div><p className="text-lg font-bold text-navy">{h.shop.name}</p><p className="text-xs text-slate-400">Dicek {new Date(h.checked_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
          </div>
          {h.overall && (
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-4 py-1.5 text-sm font-bold text-white ${TONE[h.overall.rating] ?? "bg-slate-400"}`}>Performa: {h.overall.label}</span>
              <span className="flex gap-1">{[1, 2, 3, 4].map((n) => <span key={n} className={`h-2 w-6 rounded-full ${n <= h.overall!.rating ? TONE[h.overall!.rating] : "bg-slate-200"}`} />)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={ShieldAlert} label="Poin penalti kuartal ini" value={h.penalty.total} bad={h.penalty.total > 0} hint={h.penalty.total >= 3 ? "Mulai 3 poin Shopee bisa membatasi toko" : undefined} />
          <Stat icon={Clock} label="Pesanan terlambat" value={h.late_orders.length} bad={h.late_orders.length > 0} />
          <Stat icon={Package} label="Listing bermasalah" value={h.listings.length} bad={h.listings.length > 0} />
          <Stat icon={HeartPulse} label="Metrik belum capai target" value={failed.length} bad={failed.length > 0} />
        </div>
        {Object.keys(h.errors).length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Sebagian data tidak bisa diambil ({Object.keys(h.errors).join(", ")}). Bisa jadi izin API Kesehatan Akun belum aktif untuk aplikasi Pesanin, coba lagi nanti.</p>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <p className="mb-3 font-bold text-navy">Performa toko</p>
          {!h.metrics.length ? <p className="text-sm text-slate-500">Belum ada data performa.</p> : (
            <div className="space-y-4">
              {h.metrics.map((g) => (
                <div key={g.type}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.type}</p>
                  <table className="w-full text-sm"><tbody>
                    {g.metrics.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="py-2 pr-2">{m.ok === false ? <XCircle size={15} className="text-rose-500" /> : m.ok ? <CheckCircle2 size={15} className="text-emerald-500" /> : <span className="block h-[15px] w-[15px]" />}</td>
                        <td className={`py-2 pr-3 ${m.parent_id ? "pl-3 text-slate-500" : "text-slate-700"}`}>{m.name}</td>
                        <td className={`whitespace-nowrap py-2 pr-3 text-right font-semibold ${m.ok === false ? "text-rose-600" : "text-navy"}`}>{fmt(m.current, m.unit)}</td>
                        <td className="whitespace-nowrap py-2 text-right text-xs text-slate-400">{m.target ? `target ${m.target}${m.unit}` : ""}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel className="p-5">
            <p className="mb-3 font-bold text-navy">Poin penalti <span className="text-sm font-normal text-slate-400">(kuartal ini)</span></p>
            {!h.penalty.records.length ? <p className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 size={15} />Tidak ada poin penalti.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {h.penalty.records.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span><b className="block text-slate-700">{p.reason}</b><span className="text-xs text-slate-400">{day(p.at)}{p.original !== p.points ? ` · dari ${p.original} poin (banding diterima)` : ""}</span></span>
                    <span className="shrink-0 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">+{p.points} poin</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="p-5">
            <p className="mb-3 font-bold text-navy">Pesanan terlambat dikirim</p>
            {!h.late_orders.length ? <p className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 size={15} />Tidak ada pesanan terlambat.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {h.late_orders.map((o) => (
                  <li key={o.order_sn} className="flex items-center justify-between gap-3 py-2">
                    <span><b className="block font-mono text-slate-700">{o.order_sn}</b><span className="text-xs text-slate-400">{o.buyer ?? "-"} · batas kirim {day(o.deadline)}</span></span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">telat {o.late_days} hari</span>
                      <Link href={`/marketplace/orders?search=${o.order_sn}`} className="text-xs font-semibold text-[#ee4d2d]">Atur</Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="p-5">
            <p className="mb-3 font-bold text-navy">Listing bermasalah</p>
            {!h.listings.length ? <p className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 size={15} />Semua listing aman.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {h.listings.map((l) => (
                  <li key={l.item_id} className="flex items-center gap-3 py-2">
                    {l.image ? <img src={l.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package size={16} /></span>}
                    <span className="min-w-0 flex-1"><b className="block truncate text-slate-700">{l.name}</b><span className="text-xs text-rose-600">{l.reason}</span></span>
                    <a href={`https://seller.shopee.co.id/portal/product/${l.item_id}`} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#ee4d2d]">Perbaiki<ExternalLink size={12} /></a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, bad, hint }: { icon: typeof Clock; label: string; value: number; bad: boolean; hint?: string }) {
  return (
    <div className={`rounded-xl border p-3 ${bad ? "border-rose-100 bg-rose-50/60" : "border-slate-100 bg-slate-50/60"}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Icon size={14} className={bad ? "text-rose-500" : "text-emerald-500"} />{label}</p>
      <p className={`mt-1 text-xl font-bold ${bad ? "text-rose-600" : "text-navy"}`}>{value}</p>
      {hint && <p className="text-[11px] text-rose-600">{hint}</p>}
    </div>
  );
}
