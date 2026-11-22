"use client";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, ExternalLink, Loader2, RefreshCcw, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Totals = { balance: number | null; pending: number | null; released: number | null };

/**
 * Marketplace → Saldo: the Shopee seller balance of every connected shop, straight from Shopee's payment API,
 * kept apart from Pesanin's own balance (web checkout & manual orders, under Operasional Media Sosial → Saldo).
 */
export default function MarketplaceBalance() {
  const [d, setD] = useState<{ shops: ShopeeWallet[]; totals: Totals } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = useCallback((fresh = false) => {
    setBusy(true); setErr("");
    api<{ shops: ShopeeWallet[]; totals: Totals }>(`/marketplace/balance${fresh ? "?fresh=1" : ""}`)
      .then(setD).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal mengambil saldo Shopee")).finally(() => setBusy(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const money = (v: number | null | undefined) => (v === null || v === undefined ? "–" : rupiah(v));
  const many = (d?.shops.length ?? 0) > 1;

  return (
    <div className="space-y-5">
      <PageHead title="Saldo Marketplace" tutorial={false} crumbs={[["Marketplace"], ["Saldo"]]}>
        <button onClick={() => load(true)} disabled={busy} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Perbarui dari Shopee
        </button>
      </PageHead>
      <p className="-mt-2 text-sm text-slate-500">Saldo penjual dari Shopee{many ? " untuk semua toko yang terhubung" : ""}, diambil langsung dari Shopee. Penarikan saldo dilakukan di Shopee Seller Centre.</p>
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      {!d ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat saldo dari Shopee…</p>
        : !d.shops.length ? (
          <Panel className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Store size={22} /></span>
            <p className="text-sm text-slate-500">Belum ada toko Shopee yang terhubung.</p>
            <Link href="/marketplace/shops" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Hubungkan toko</Link>
          </Panel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <TotalCard icon={<Wallet size={18} />} tone="bg-orange-100 text-orange-600" label={many ? "Total Saldo Penjual" : "Saldo Penjual"} value={money(d.totals.balance)} hint="Saldo dompet Shopee yang bisa ditarik" />
              <TotalCard icon={<Clock size={18} />} tone="bg-amber-100 text-amber-600" label={many ? "Total Belum Cair" : "Belum Cair"} value={money(d.totals.pending)} hint="Penghasilan pesanan yang masih ditahan Shopee" />
              <TotalCard icon={<CheckCircle2 size={18} />} tone="bg-emerald-100 text-emerald-600" label={many ? "Total Sudah Cair" : "Sudah Cair"} value={money(d.totals.released)} hint="Penghasilan yang sudah dilepas ke saldo" />
            </div>
            <PendingBreakdown shopeePending={d.totals.pending} />
            <Panel className="space-y-4 p-6">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-800"><ShopeeMark size={18} />{many ? "Rincian per toko" : "Mutasi saldo terakhir"}</h2>
              {d.shops.map((w) => <ShopeeWalletCard key={w.shop_id} w={w} showName={many} />)}
            </Panel>
          </>
        )}
    </div>
  );
}

function TotalCard({ icon, tone, label, value, hint }: { icon: React.ReactNode; tone: string; label: string; value: string; hint: string }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2 text-sm text-slate-600"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone}`}>{icon}</span>{label}</div>
      <div className="mt-3 text-2xl font-bold text-slate-800">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </Panel>
  );
}

type ShopeeWallet = {
  shop_id: number; shop_name: string; balance: number | null; balance_at: string | null; pending: number | null; released: number | null; error: string | null;
  transactions: { date: string | null; type: string; order_sn: string | null; amount: number; balance: number; status: string | null }[];
};

/** One shop's Shopee seller balance: wallet, pending and released income, and the latest wallet movements. */
function ShopeeWalletCard({ w, showName }: { w: ShopeeWallet; showName: boolean }) {
  const when = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
  const money = (v: number | null) => (v === null ? "–" : rupiah(v));
  if (!showName && !w.transactions.length && !w.error) return <p className="text-sm text-slate-500">Belum ada mutasi saldo dalam beberapa minggu terakhir.</p>;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      {showName && <div className="text-sm font-semibold text-slate-700">{w.shop_name}</div>}
      {showName && <div className="grid gap-3 sm:grid-cols-3">
        <div><div className="text-xs text-slate-500">Saldo Penjual Shopee</div><div className="mt-1 text-2xl font-bold text-slate-800">{money(w.balance)}</div>{w.balance_at && <div className="text-[11px] text-slate-400">per transaksi terakhir {when(w.balance_at)}</div>}</div>
        <div><div className="text-xs text-slate-500">Penghasilan Belum Cair</div><div className="mt-1 text-xl font-semibold text-amber-600">{money(w.pending)}</div></div>
        <div><div className="text-xs text-slate-500">Penghasilan Sudah Cair</div><div className="mt-1 text-xl font-semibold text-emerald-600">{money(w.released)}</div></div>
      </div>}
      {!showName && w.balance_at && <p className="text-xs text-slate-400">Saldo per transaksi terakhir {when(w.balance_at)}</p>}
      {w.error && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">Sebagian data Shopee belum bisa diambil: {w.error}</p>}
      {w.transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1.5 font-medium">Tanggal</th><th className="font-medium">Transaksi</th><th className="font-medium">No. Pesanan</th><th className="text-right font-medium">Jumlah</th><th className="text-right font-medium">Saldo</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {w.transactions.map((t, i) => (
                <tr key={i}><td className="py-1.5 text-slate-500">{when(t.date)}</td><td className="text-slate-700">{t.type}</td><td className="font-mono text-xs text-slate-500">{t.order_sn ?? "-"}</td>
                  <td className={`text-right font-semibold ${t.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>{t.amount < 0 ? "−" : "+"}{rupiah(Math.abs(t.amount))}</td><td className="text-right text-slate-600">{rupiah(t.balance)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type PendingItem = { order_id: number; order_sn: string; shop: string | null; buyer: string | null; amount: number; estimated: boolean; since: string | null; days: number | null; stuck: string | null; resi: string | null };
type PendingGroup = { key: string; title: string; help: string; count: number; amount: number; stuck: number; items: PendingItem[] };
type Pending = { groups: PendingGroup[]; total: number; count: number; stuck: number };

const GROUP_TONE: Record<string, string> = {
  cancel: "bg-rose-50 text-rose-700", return: "bg-rose-50 text-rose-700", delivered: "bg-emerald-50 text-emerald-700",
  shipping: "bg-sky-50 text-sky-700", not_shipped: "bg-amber-50 text-amber-700",
};

/** Where the pending (not yet released) money is: per order status, with the orders that hold it too long. */
function PendingBreakdown({ shopeePending }: { shopeePending: number | null }) {
  const [p, setP] = useState<Pending | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    api<Pending>("/marketplace/balance/pending").then((r) => { setP(r); setOpen((o) => o ?? r.groups.find((g) => g.stuck > 0)?.key ?? null); }).catch(() => setP(null));
  }, []);
  if (!p) return null;

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-800"><Clock size={18} className="text-amber-600" />Rincian Dana Pending</h2>
          <p className="mt-0.5 text-xs text-slate-500">Shopee menahan penghasilan sampai pesanan selesai. Ini posisi uangnya per status pesanan (dari {p.count} pesanan yang belum selesai).</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-amber-600">{rupiah(p.total)}</p>
          <p className="text-[11px] text-slate-400">perkiraan Pesanin{shopeePending !== null ? ` · Shopee: ${rupiah(shopeePending)}` : ""}</p>
        </div>
      </div>
      {p.stuck > 0 && <p className="flex items-center gap-2 border-b border-slate-100 bg-amber-50/60 px-6 py-2.5 text-xs font-semibold text-amber-800"><AlertTriangle size={14} />{p.stuck} pesanan menahan dana terlalu lama atau butuh tindakan.</p>}
      {!p.count && <p className="px-6 py-8 text-center text-sm text-slate-500">Tidak ada pesanan yang menahan dana.</p>}
      <div className="divide-y divide-slate-100">
        {p.groups.filter((g) => g.count > 0).map((g) => {
          const isOpen = open === g.key;
          return (
            <div key={g.key}>
              <button onClick={() => setOpen(isOpen ? null : g.key)} className="flex w-full items-center gap-3 px-6 py-3.5 text-left hover:bg-slate-50/60">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${GROUP_TONE[g.key] ?? "bg-slate-100 text-slate-600"}`}>{g.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy">{g.title}</span>
                  {g.stuck > 0 && <span className="text-[11px] font-semibold text-amber-700">{g.stuck} perlu tindakan</span>}
                </span>
                <span className="font-semibold text-navy">{rupiah(g.amount)}</span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40">
                  <p className="px-6 py-2 text-xs text-slate-500">{g.help}</p>
                  <div className="divide-y divide-slate-100">
                    {g.items.map((i) => (
                      <div key={i.order_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-semibold text-navy">{i.order_sn}</p>
                          <p className="text-xs text-slate-500">{[i.shop, i.buyer, i.days !== null ? `${i.days} hari` : null, i.resi].filter(Boolean).join(" · ")}</p>
                          {i.stuck && <p className="text-[11px] font-semibold text-amber-700">{i.stuck}</p>}
                        </div>
                        <span className="text-right font-semibold text-navy">{rupiah(i.amount)}{i.estimated && <span className="block text-[10px] font-normal text-slate-400">perkiraan</span>}</span>
                        <Link href={`/marketplace/orders/${i.order_id}`} className="flex items-center gap-1 text-xs font-semibold text-brand-600">Detail<ExternalLink size={12} /></Link>
                      </div>
                    ))}
                    {g.count > g.items.length && <p className="px-6 py-2 text-xs text-slate-400">+{g.count - g.items.length} pesanan lain</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
