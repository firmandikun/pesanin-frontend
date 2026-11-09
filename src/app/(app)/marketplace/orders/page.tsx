"use client";
import { ORDERS_EVENT } from "@/components/NotificationBell";
import { CheckSquare, Info, Loader2, PackageSearch, Printer, RefreshCcw, Store, Truck } from "lucide-react";
import { actionCell, RowAction } from "@/components/RowAction";
import { TrackingModal } from "@/components/TrackingModal";
import { ShipModal } from "@/components/marketplace/ShipModal";
import { openShopeeAwb } from "@/lib/awb";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Pager, PageHead, Panel, SearchBox } from "@/components/kit";
import { Select } from "@/components/Select";
import { needsShipping } from "@/components/ShipActions";
import { cleanCourier } from "@/lib/courier";
import { api, ApiError, fmtDate, Order, Paginated, rupiah } from "@/lib/api";

const STATES: [string, string][] = [
  ["to_ship", "Perlu dikirim"], ["processed", "Siap diserahkan"], ["shipping", "Dalam pengiriman"],
  ["done", "Selesai"], ["cancelled", "Dibatalkan / retur"], ["unpaid", "Belum dibayar"],
];
const STATUS_TEXT: Record<string, [string, string]> = {
  READY_TO_SHIP: ["Perlu dikirim", "bg-amber-50 text-amber-700"], RETRY_SHIP: ["Siap diserahkan", "bg-sky-50 text-sky-700"],
  PROCESSED: ["Siap diserahkan", "bg-sky-50 text-sky-700"], SHIPPED: ["Dalam pengiriman", "bg-indigo-50 text-indigo-700"],
  TO_CONFIRM_RECEIVE: ["Sampai, menunggu konfirmasi", "bg-indigo-50 text-indigo-700"], COMPLETED: ["Selesai", "bg-emerald-50 text-emerald-700"],
  CANCELLED: ["Dibatalkan", "bg-slate-100 text-slate-500"], IN_CANCEL: ["Proses batal", "bg-slate-100 text-slate-500"],
  TO_RETURN: ["Retur", "bg-rose-50 text-rose-700"], UNPAID: ["Belum dibayar", "bg-slate-100 text-slate-500"],
};
/** A label can be printed only while the parcel waits for pickup; once on the way it is locked. */
const ARRANGED = ["PROCESSED", "RETRY_SHIP"];
const canPrint = (o: Order) => ARRANGED.includes(o.external_status ?? "") && !!o.tracking_number;
const awaitingAwb = (o: Order) => ARRANGED.includes(o.external_status ?? "") && !o.tracking_number;
const canTrack = (o: Order) => !!o.tracking_number && ["PROCESSED", "RETRY_SHIP", "SHIPPED", "TO_CONFIRM_RECEIVE", "COMPLETED", "TO_RETURN"].includes(o.external_status ?? "");

export default function ShopeeOrders() {
  const [state, setState] = useState("to_ship");
  const [shopId, setShopId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [shops, setShops] = useState<{ id: number; shop_name: string; status: string }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [shipIds, setShipIds] = useState<number[] | null>(null);
  const [track, setTrack] = useState<Order | null>(null);

  const base = useCallback((extra: Record<string, string>) => new URLSearchParams({ channel: "shopee", ...(shopId ? { marketplace_shop_id: shopId } : {}), ...extra }).toString(), [shopId]);
  const load = useCallback(() => {
    api<{ orders: Paginated<Order> }>(`/orders?${base({ shopee_state: state, search, page: String(page), per_page: String(perPage) })}`).then((d) => setData(d.orders));
    Promise.all(STATES.map(([k]) => api(`/orders?${base({ shopee_state: k, per_page: "1" })}`).then((d) => [k, d.stats.total_orders] as const)))
      .then((r) => setCounts(Object.fromEntries(r)));
    setSelected([]);
  }, [base, state, search, page, perPage]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  // New order notification → refresh the list without a page reload.
  useEffect(() => { window.addEventListener(ORDERS_EVENT, load); return () => window.removeEventListener(ORDERS_EVENT, load); }, [load]);
  useEffect(() => { api("/marketplace/shops").then((d) => setShops(d.shops.filter((s: any) => s.status !== "disconnected"))); }, []);

  const rows = data?.data ?? [];
  const chosen = rows.filter((o) => selected.includes(o.id));
  const shipChosen = chosen.filter(needsShipping);
  const printChosen = chosen.filter(canPrint);

  async function print(list: Order[]) {
    setBusy("print"); setNotice("");
    try { await openShopeeAwb(list); }
    catch (e) { setNotice((e as Error).message); }
    finally { setBusy(""); }
  }
  /** Pull tracking numbers Shopee issues a few seconds after ship_order, then reload. */
  async function refreshAwb(ids: number[], tries = 3) {
    for (let i = 0; i < tries; i++) {
      await new Promise((r) => setTimeout(r, i === 0 && tries > 1 ? 4000 : 1500));
      const r = await api("/labels/shopee/refresh", { method: "POST", json: { order_ids: ids } }).catch(() => null);
      if (r && r.ready >= r.total) break;
    }
    load();
  }
  async function sync() {
    setBusy("sync"); setNotice("");
    try {
      const results = await Promise.all(shops.map((s) => api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "orders" } })));
      setNotice(`Sinkron selesai: ${results.reduce((n, r) => n + (r.result?.orders ?? 0), 0)} pesanan diperbarui dari ${shops.length} toko.`);
      load();
    } catch (e) { setNotice(e instanceof ApiError ? e.message : "Sinkron gagal"); }
    finally { setBusy(""); }
  }

  return (
    <div className="space-y-5">
      <PageHead title="Pesanan Shopee" tutorial={false} crumbs={[["Marketplace"], ["Pesanan Shopee"]]}>
        {shops.length > 1 && (
          <Select className="input w-56" value={shopId} onChange={(e) => { setShopId(e.target.value); setPage(1); }}>
            <option value="">Semua toko ({shops.length})</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
          </Select>
        )}
        <button onClick={sync} disabled={!!busy || !shops.length} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50">
          {busy === "sync" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Sinkronkan pesanan
        </button>
      </PageHead>

      {!shops.length && (
        <Panel className="flex items-center gap-3 p-5 text-sm text-slate-600"><Store size={18} />Belum ada toko Shopee terhubung. <Link href="/marketplace/shops" className="font-semibold text-brand-600">Hubungkan toko</Link></Panel>
      )}
      {notice && <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800"><Info size={16} className="mt-0.5 shrink-0" />{notice}</div>}

      <Panel>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          {STATES.map(([k, l]) => (
            <button key={k} onClick={() => { setState(k); setPage(1); }}
              className={`flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition ${state === k ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {l}<span className={`rounded-full px-1.5 text-xs ${state === k ? "bg-white/20" : "bg-white text-slate-500"}`}>{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari no. pesanan, nama, resi" />
          <span className="ml-auto flex flex-wrap gap-2">
            {rows.some(needsShipping) && <button onClick={() => setSelected(rows.filter(needsShipping).map((o) => o.id))} className="btn-outline btn-sm"><CheckSquare size={14} />Pilih semua siap kirim</button>}
            {rows.some(canPrint) && <button onClick={() => setSelected(rows.filter(canPrint).map((o) => o.id))} className="btn-outline btn-sm"><CheckSquare size={14} />Pilih semua siap cetak</button>}
          </span>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-y border-brand-100 bg-brand-50 px-4 py-2.5 text-sm">
            <b className="mr-2">{selected.length} dipilih</b>
            {shipChosen.length > 0 && (
              <RowAction wide={false} tone="shopee" icon={Truck} onClick={() => setShipIds(shipChosen.map((o) => o.id))}>Atur pengiriman ({shipChosen.length})</RowAction>
            )}
            {printChosen.length > 0 && (
              <RowAction wide={false} tone="primary" icon={Printer} busy={busy === "print"} disabled={!!busy} onClick={() => print(printChosen)}>Cetak resi ({printChosen.length})</RowAction>
            )}
            <button onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-slate-500 hover:text-navy">Batal pilih</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 py-3 pl-4 pr-1"><input type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((o) => o.id) : [])} /></th>
                <th className="px-3 py-3 font-semibold">Pesanan</th>
                <th className="px-3 py-3 font-semibold">Produk (SKU)</th>
                <th className="px-3 py-3 font-semibold">Ekspedisi & resi</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Total</th>
                <th className={`${actionCell} bg-slate-50 font-semibold`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => {
                const [label, tone] = STATUS_TEXT[o.external_status ?? ""] ?? [o.external_status ?? "-", "bg-slate-100 text-slate-500"];
                return (
                  <tr key={o.id} className="align-top">
                    <td className="py-3.5 pl-4 pr-1"><input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))} /></td>
                    <td className="px-3 py-3.5">
                      <p className="font-mono text-xs font-semibold text-navy">{o.external_order_sn}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><ShopeeMark size={12} /><span className="max-w-[150px] truncate">{o.marketplace_shop?.shop_name}</span></p>
                      <p className="mt-0.5 text-xs text-slate-400">{fmtDate(o.created_at)}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      {(o.items ?? []).map((i, k) => (
                        <div key={k} className="text-xs [&+&]:mt-1.5">
                          <p><span className="font-mono font-semibold text-navy">{i.sku || "tanpa SKU"}</span><span className="text-slate-500"> × {i.qty}</span></p>
                          <p className="max-w-[190px] truncate text-slate-400">{i.name}{i.variant ? ` · ${i.variant}` : ""}</p>
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <p className="whitespace-nowrap font-medium text-slate-700">{cleanCourier(o.courier)}</p>
                      <p className="mt-0.5 whitespace-nowrap font-mono text-slate-400">{o.tracking_number || "resi belum terbit"}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                      {o.external_note && <p className="mt-1.5 max-w-[220px] text-xs leading-snug text-slate-500" title={o.external_note}>{o.external_note}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-navy">{rupiah(o.total)}</td>
                    <td className={actionCell}>
                      <div className="flex flex-col gap-1.5">
                        {needsShipping(o) && <RowAction tone="shopee" icon={Truck} onClick={() => setShipIds([o.id])}>Atur pengiriman</RowAction>}
                        {canPrint(o) && <RowAction tone="primary" icon={Printer} busy={busy === "print"} disabled={!!busy} onClick={() => print([o])}>Cetak resi</RowAction>}
                        {awaitingAwb(o) && <RowAction icon={RefreshCcw} busy={busy === `awb${o.id}`} title="Shopee sedang menerbitkan nomor resi. Klik untuk cek lagi." onClick={async () => { setBusy(`awb${o.id}`); await refreshAwb([o.id], 1); setBusy(""); }}>Resi diproses…</RowAction>}
                        {canTrack(o) && <RowAction icon={PackageSearch} onClick={() => setTrack(o)}>Lacak</RowAction>}
                        {!needsShipping(o) && !canPrint(o) && !canTrack(o) && !awaitingAwb(o) && <span className="block text-center text-xs text-slate-300">-</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && rows.length === 0 && <p className="py-14 text-center text-sm text-slate-500">Tidak ada pesanan di status ini.</p>}
          {!data && <p className="py-14 text-center text-sm text-slate-400">Memuat pesanan…</p>}
        </div>
        {data && <Pager page={data.current_page} last={data.last_page} onPage={setPage} total={data.total} perPage={perPage} onPerPage={setPerPage} />}
      </Panel>
      {track && <TrackingModal orderId={track.id} title={`Lacak · ${track.external_order_sn}`} onClose={() => setTrack(null)} />}
      {shipIds && <ShipModal orderIds={shipIds} onClose={() => setShipIds(null)} onDone={(m) => { const ids = shipIds; setShipIds(null); setNotice(m); load(); refreshAwb(ids); }} />}
    </div>
  );
}
