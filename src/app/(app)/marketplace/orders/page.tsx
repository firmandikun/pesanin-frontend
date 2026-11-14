"use client";
import { ORDERS_EVENT } from "@/components/NotificationBell";
import { ArrowDownUp, FileText, Info, Loader2, PackageCheck, PackageSearch, Printer, RefreshCcw, Search, Store, Truck } from "lucide-react";
import { TrackingModal } from "@/components/TrackingModal";
import { ShipModal } from "@/components/marketplace/ShipModal";
import { openShopeeAwb, openShopeeAwbMerged, type AwbResult } from "@/lib/awb";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { Dialog, Pager, PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { needsShipping } from "@/components/ShipActions";
import { cleanCourier } from "@/lib/courier";
import { api, ApiError, Order, Paginated, rupiah } from "@/lib/api";

/**
 * Pesanan Shopee, laid out like Seller Centre's "Pesanan Saya": status tabs, order type and sub-status
 * filters, then one card per order (buyer + order number on top; product, paid amount, status, courier, actions).
 */

// Main tabs → the backend's shopee_state ("" = every status).
const TABS: { key: string; label: string; count: boolean }[] = [
  { key: "", label: "Semua", count: false },
  { key: "unpaid", label: "Belum Bayar", count: true },
  { key: "perlu_kirim", label: "Perlu Dikirim", count: true },
  // Orders fulfilled by Shopee (Advance Fulfilment): no manual arranging, just print the auto-issued resi.
  { key: "advance", label: "Advance Fulfilment", count: true },
  { key: "shipping", label: "Dikirim", count: true },
  { key: "done", label: "Selesai", count: false },
  // Badge = requests waiting for the seller (returns + buyer cancel requests), as in Seller Centre.
  { key: "cancelled", label: "Pengembalian/Pembatalan", count: false },
];
// Sub-status inside "Perlu Dikirim", as in Seller Centre.
const SUB: [string, string][] = [["perlu_kirim", "Semua"], ["to_ship", "Perlu diproses"], ["processed", "Telah diproses"]];
const WITH_KILAT = ["", "perlu_kirim", "to_ship", "processed", "shipping"];
const SEARCH_BY: [string, string][] = [["sn", "No. Pesanan"], ["buyer", "Nama/username pembeli"], ["product", "Produk / SKU"], ["resi", "No. Resi"]];

/** "Pengiriman Kilat": a delivery van with speed lines (fast, Shopee-arranged fulfilment). */
function KilatIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M1 8h4M2 12h3M3 16h2" />
      <path d="M7 6h9v10H7z" />
      <path d="M16 9h3.5l2.5 3v4h-6" />
      <circle cx="10" cy="17.5" r="1.8" fill="white" />
      <circle cx="18.5" cy="17.5" r="1.8" fill="white" />
    </svg>
  );
}

/** Seller Centre's wording: [status, explanation]. */
function statusText(o: Order): [string, string, string] {
  const reason = o.custom_fields?.cancel_reason;
  switch (o.external_status) {
    case "UNPAID": return ["Belum Bayar", "Menunggu pembayaran dari pembeli.", "text-slate-600"];
    case "READY_TO_SHIP": return ["Perlu Dikirim", "Atur pengiriman sebelum batas waktu.", "text-amber-600"];
    case "PROCESSED": return ["Perlu Dikirim", o.tracking_number ? "Menunggu pengiriman diverifikasi oleh jasa kirim." : "Nomor resi sedang diterbitkan Shopee.", "text-amber-600"];
    case "RETRY_SHIP": return ["Kirim Ulang", o.external_note || "Penjemputan gagal, kurir akan datang lagi.", "text-rose-600"];
    case "IN_CANCEL": return ["Pembatalan Diajukan", reason ? `Pembeli mengajukan batal: ${reason}` : "Pembeli mengajukan pembatalan. Tanggapi di Seller Centre.", "text-rose-600"];
    case "SHIPPED": return ["Sudah Kirim", "Pesanan sedang dikirimkan ke Pembeli.", "text-navy"];
    case "TO_CONFIRM_RECEIVE": return ["Sudah Kirim", "Pesanan sudah sampai, menunggu konfirmasi Pembeli.", "text-navy"];
    case "TO_RETURN": return ["Pengembalian", "Pembeli mengajukan pengembalian barang/dana.", "text-rose-600"];
    case "COMPLETED": return ["Selesai", "Pesanan selesai.", "text-emerald-600"];
    case "CANCELLED": return ["Batal", reason ? `Alasan: ${reason}` : "Pesanan dibatalkan.", "text-slate-500"];
    default: return [o.external_status ?? "-", "", "text-slate-600"];
  }
}

const ARRANGED = ["PROCESSED", "RETRY_SHIP", "IN_CANCEL"];
const canPrint = (o: Order) => ARRANGED.includes(o.external_status ?? "") && !!o.tracking_number;
const awaitingAwb = (o: Order) => ["PROCESSED", "RETRY_SHIP"].includes(o.external_status ?? "") && !o.tracking_number;
const canTrack = (o: Order) => !!o.tracking_number && ["PROCESSED", "RETRY_SHIP", "SHIPPED", "TO_CONFIRM_RECEIVE", "COMPLETED", "TO_RETURN"].includes(o.external_status ?? "");
const fmtShort = (s: string) => new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Booking = { id: number; marketplace_shop_id: number; booking_sn: string; order_sn: string | null; booking_status: string; shipping_carrier: string | null; tracking_number: string | null; booked_at: string | null; items: { name: string; variant: string | null; sku: string | null; item_sku?: string | null; model_sku?: string | null; qty: number; image?: string | null }[] | null; marketplace_shop?: { shop_name: string } };
type Item = NonNullable<Order["items"]>[number] & { image?: string | null };
type ListRes = { orders: Paginated<Order>; stats: { total_orders: number }; bookings?: { total: number; data: Booking[] }; couriers?: string[]; attention?: { returns: number; cancel_requests: number } };
type ReturnReq = { id: number; return_sn: string; order_sn: string | null; status: string; reason: string | null; text_reason: string | null; refund_amount: number; buyer_username: string | null; tracking_number: string | null; due_at: string | null; requested_at: string | null; items: { name: string; variant: string | null; sku: string | null; qty: number; image?: string | null }[] | null; marketplace_shop?: { shop_name: string } };

/** Return request status in Seller Centre's words: [label, tone]. */
const RETURN_STATUS: Record<string, [string, string]> = {
  REQUESTED: ["Pengajuan Baru", "text-rose-600"], PROCESSING: ["Menunggu Validasi Penjual", "text-rose-600"],
  ACCEPTED: ["Dana Dikembalikan ke Pembeli", "text-slate-600"], JUDGING: ["Sedang Ditinjau Shopee", "text-amber-600"],
  SELLER_DISPUTE: ["Banding Diajukan", "text-amber-600"], CANCELLED: ["Dibatalkan Pembeli", "text-slate-500"], CLOSED: ["Selesai", "text-slate-500"],
};
const REASON: Record<string, string> = {
  NOT_RECEIPT: "Belum menerima pesanan", WRONG_ITEM: "Barang yang dikirim salah", ITEM_DAMAGED: "Barang rusak", DIFFERENT_DESCRIPTION: "Barang tidak sesuai deskripsi",
  MUTUAL_AGREE: "Kesepakatan bersama", OTHER: "Lainnya", ITEM_WRONGDAMAGED: "Barang salah/rusak", CHANGE_MIND: "Berubah pikiran", ITEM_MISSING: "Barang kurang",
  EXPECTATION_FAILED: "Tidak sesuai harapan", ITEM_FAKE: "Barang palsu", PHYSICAL_DMG: "Kerusakan fisik", FUNCTIONAL_DMG: "Tidak berfungsi",
};

// Column widths shared by the header row and every card, like Seller Centre's table.
const COLS = "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_minmax(0,0.95fr)] gap-4";

function Thumb({ src }: { src?: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-14 w-14 shrink-0 rounded-md border border-slate-100 object-cover" />
    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300"><PackageCheck size={20} /></span>;
}

function Products({ items }: { items: Item[] }) {
  return (
    <div className="space-y-3">
      {items.map((i, k) => (
        <div key={k} className="flex gap-3">
          <Thumb src={i.image} />
          <div className="min-w-0 flex-1">
            <p className="flex gap-2 text-[13px] font-medium leading-snug text-slate-800"><span className="line-clamp-2 flex-1">{i.name}</span><span className="shrink-0 text-slate-500">x{i.qty}</span></p>
            {i.variant && <p className="mt-0.5 truncate text-xs text-slate-500">Variasi: {i.variant}</p>}
            {i.sku && <p className="mt-0.5 font-mono text-[11px] text-slate-400">SKU {i.sku}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionLink({ children, onClick, busy, disabled, icon: Icon }: { children: React.ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean; icon?: typeof Truck }) {
  return (
    <button onClick={onClick} disabled={disabled || busy} className="flex items-center gap-1.5 text-left text-[13px] font-medium text-sky-600 hover:text-sky-700 hover:underline disabled:opacity-50">
      {busy ? <Loader2 size={13} className="animate-spin" /> : Icon ? <Icon size={13} /> : null}{children}
    </button>
  );
}

export default function ShopeeOrders() {
  const [tab, setTab] = useState("perlu_kirim");
  const [sub, setSub] = useState("perlu_kirim");
  const [kind, setKind] = useState<"" | "order" | "kilat">("");
  const [shopId, setShopId] = useState("");
  const [by, setBy] = useState("sn");
  const [draft, setDraft] = useState({ search: "", courier: "" });
  const [filters, setFilters] = useState({ search: "", courier: "" });
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [split, setSplit] = useState({ order: 0, kilat: 0 });
  // Dikirim → "Dikirim Dari": seller's own stock vs Pengiriman Kilat stock.
  const [stock, setStock] = useState<"" | "seller" | "kilat">("");
  const [doneScope, setDoneScope] = useState<"today" | "all">("today");
  const [stockCounts, setStockCounts] = useState({ seller: 0, kilat: 0 });
  // Perlu Dikirim → Status Pesanan counts (Semua / Perlu diproses / Telah diproses), for the chosen order type.
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});
  // Pengembalian/Pembatalan sub-tab.
  const [retTab, setRetTab] = useState<"returns" | "pembatalan">("returns");
  const [returns, setReturns] = useState<Paginated<ReturnReq> | null>(null);
  const [attention, setAttention] = useState({ returns: 0, cancel_requests: 0 });
  const [couriers, setCouriers] = useState<string[]>([]);
  const [shops, setShops] = useState<{ id: number; shop_name: string; status: string }[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedBk, setSelectedBk] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [shipIds, setShipIds] = useState<number[] | null>(null);
  const [track, setTrack] = useState<Order | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);

  useEffect(() => {
    const selectedShop = new URLSearchParams(window.location.search).get("shop_id");
    if (selectedShop) setShopId(selectedShop);
  }, []);

  const state = tab === "perlu_kirim" ? sub : tab === "cancelled" ? "pembatalan" : tab;
  const showingReturns = tab === "cancelled" && retTab === "returns";
  const base = useCallback((extra: Record<string, string>) => new URLSearchParams({
    channel: "shopee", ...(shopId ? { marketplace_shop_id: shopId } : {}),
    ...(filters.search ? { search: filters.search } : {}), ...(filters.courier ? { shopee_courier: filters.courier } : {}), ...extra,
  }).toString(), [shopId, filters]);

  // Only the newest request may fill the list: switching tabs fast must not show an older tab's result.
  const reqId = useRef(0);
  const load = useCallback(() => {
    const id = ++reqId.current;
    setData(null);
    const st: Record<string, string> = state ? { shopee_state: state } : {};
    const stockQ: Record<string, string> = tab === "shipping" && kind === "order" && stock ? { stock } : {};
    const doneQ: Record<string, string> = tab === "done" && doneScope === "all" ? { done: "all" } : {};
    if (showingReturns) {
      setReturns(null);
      api<Paginated<ReturnReq>>(`/marketplace/returns?${new URLSearchParams({ ...(shopId ? { shop_id: shopId } : {}), ...(filters.search ? { search: filters.search } : {}), page: String(page), per_page: String(perPage) })}`)
        .then((r) => { if (id === reqId.current) setReturns(r); });
    }
    api<ListRes>(`/orders?${base({ ...st, ...stockQ, ...doneQ, ...(kind ? { kind } : {}), sort: "created_at", dir, page: String(page), per_page: String(perPage), facets: "1" })}`)
      .then((d) => { if (id !== reqId.current) return; setData(d.orders); setBookings(d.bookings?.data ?? []); if (d.couriers) setCouriers(d.couriers); if (d.attention) setAttention(d.attention); });
    if (tab === "perlu_kirim") {
      Promise.all(SUB.map(([k]) => api<ListRes>(`/orders?${base({ shopee_state: k, ...(kind ? { kind } : {}), per_page: "1" })}`)
        .then((d) => [k, d.stats.total_orders + (d.bookings?.total ?? 0)] as const)))
        .then((r) => { if (id === reqId.current) setSubCounts(Object.fromEntries(r)); });
    }
    if (tab === "shipping") {
      Promise.all((["seller", "kilat"] as const).map((k) => api<ListRes>(`/orders?${base({ ...st, kind: "order", stock: k, per_page: "1" })}`).then((d) => d.stats.total_orders)))
        .then(([seller, kilat]) => { if (id === reqId.current) setStockCounts({ seller, kilat }); });
    }
    // Tab counts: orders + "Pengiriman Kilat" reservations, as Seller Centre counts them.
    Promise.all(TABS.filter((t) => t.count).map((t) => api<ListRes>(`/orders?${base({ shopee_state: t.key, per_page: "1" })}`)
      .then((d) => [t.key, d.stats.total_orders + (d.bookings?.total ?? 0)] as const)))
      .then((r) => { if (id === reqId.current) setCounts(Object.fromEntries(r)); });
    api<ListRes>(`/orders?${base({ ...st, per_page: "1" })}`).then((d) => { if (id === reqId.current) setSplit({ order: d.stats.total_orders, kilat: d.bookings?.total ?? 0 }); });
    setSelected([]);
    setSelectedBk([]);
  }, [base, state, kind, stock, doneScope, tab, showingReturns, shopId, filters.search, dir, page, perPage]);
  useEffect(() => { const t = setTimeout(load, 150); return () => clearTimeout(t); }, [load]);
  useEffect(() => { window.addEventListener(ORDERS_EVENT, load); return () => window.removeEventListener(ORDERS_EVENT, load); }, [load]);
  useEffect(() => { api("/marketplace/shops").then((d) => setShops(d.shops.filter((s: any) => s.status !== "disconnected"))).catch(() => setShops([])); }, []);
  const shopList = shops ?? [];

  const rows = data?.data ?? [];
  const chosen = rows.filter((o) => selected.includes(o.id));
  // Only orders with a next step (atur pengiriman / cetak label) can be picked, as in Seller Centre.
  const selectableRows = rows.filter((o) => needsShipping(o) || canPrint(o));
  const shipChosen = chosen.filter(needsShipping);
  const printChosen = chosen.filter(canPrint);
  const total = (data?.total ?? 0) + (page === 1 ? bookings.length : 0);
  const showKilat = WITH_KILAT.includes(state);
  // Pengiriman Kilat reservations ready to print (bulk / select).
  const printableBk = bookings.filter((b) => b.booking_status === "PROCESSED");
  const chosenBk = printableBk.filter((b) => selectedBk.includes(b.id));
  // One master "select all" covers both orders and Pengiriman Kilat reservations.
  const anySelectable = selectableRows.length > 0 || printableBk.length > 0;
  const allChosen = anySelectable && selectableRows.every((o) => selected.includes(o.id)) && printableBk.every((b) => selectedBk.includes(b.id));
  const selectAll = (on: boolean) => { setSelected(on ? selectableRows.map((o) => o.id) : []); setSelectedBk(on ? printableBk.map((b) => b.id) : []); };

  /**
   * After a print: tell which labels were left out (already shipped — the server moved them to "Dikirim") or failed,
   * and reload so those orders leave this tab.
   */
  function afterPrint(r: AwbResult | null, error?: unknown) {
    const parts: string[] = [];
    if (r?.skipped.length) parts.push(`${r.skipped.length} resi tidak dicetak karena pesanannya sudah dikirim dan dipindah ke tab Dikirim: ${r.skipped.join(", ")}.`);
    if (r?.errors.length) parts.push(`Sebagian gagal dicetak: ${r.errors.join(" ")}`);
    if (error) parts.push((error as Error).message);
    setNotice(parts.join(" "));
    if (r?.skipped.length || error) load();
  }
  const bookingAwb = (b: Booking) => ({ id: b.id, marketplace_shop_id: b.marketplace_shop_id, courier: b.shipping_carrier, items: b.items ?? undefined, booking_sn: b.booking_sn, order_sn: b.order_sn });
  async function print(list: Order[]) {
    setBusy("print"); setNotice("");
    try { afterPrint(await openShopeeAwb(list)); } catch (e) { afterPrint(null, e); } finally { setBusy(""); }
  }
  /** Print orders and Pengiriman Kilat reservations together in one merged PDF. */
  async function printMixed(ords: Order[], bks: Booking[]) {
    if (!ords.length && !bks.length) return;
    setBusy("print"); setNotice("");
    try {
      afterPrint(await openShopeeAwbMerged({ orders: ords, bookings: bks.map(bookingAwb) }));
      setSelected([]); setSelectedBk([]);
    } catch (e) { afterPrint(null, e); } finally { setBusy(""); }
  }
  async function printBookings(list: Booking[]) {
    if (!list.length) return;
    setBusy(list.length > 1 ? "printbk" : `kb${list[0].id}`); setNotice("");
    try { afterPrint(await openShopeeAwb(list.map(bookingAwb), "booking")); setSelectedBk([]); }
    catch (e) { afterPrint(null, e); } finally { setBusy(""); }
  }
  const toggleBk = (id: number, on: boolean) => setSelectedBk(on ? [...selectedBk, id] : selectedBk.filter((x) => x !== id));
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
      const results = await Promise.all(shopList.map((s) => api(`/marketplace/shops/${s.id}/sync`, { method: "POST", json: { what: "orders" } })));
      setNotice(`Sinkron selesai: ${results.reduce((n, r) => n + (r.result?.orders ?? 0), 0)} pesanan diperbarui dari ${shopList.length} toko.`);
      load();
    } catch (e) { setNotice(e instanceof ApiError ? e.message : "Sinkron gagal"); } finally { setBusy(""); }
  }
  // Seller Centre's Dikirim tab has no "Semua" type: it opens on Pesanan.
  const pickTab = (k: string) => { setTab(k); setSub("perlu_kirim"); setKind(k === "shipping" ? "order" : ""); setStock(""); setDoneScope("today"); setRetTab("returns"); setPage(1); };
  const apply = () => { setFilters(draft); setPage(1); };
  const reset = () => { const empty = { search: "", courier: "" }; setDraft(empty); setFilters(empty); setKind(tab === "shipping" ? "order" : ""); setStock(""); setPage(1); };
  const toggle = (id: number, on: boolean) => setSelected(on ? [...selected, id] : selected.filter((x) => x !== id));
  const pill = (on: boolean) => `h-8 rounded-full border px-4 text-[13px] transition ${on ? "border-brand-500 bg-white font-semibold text-brand-600" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`;

  return (
    <div className="space-y-4">
      <PageHead title="Pesanan Shopee" tutorial={false} crumbs={[["Marketplace"], ["Pesanan Shopee"]]}>
        {shopList.length > 1 && (
          <Select className="input w-56" value={shopId} onChange={(e) => { setShopId(e.target.value); setPage(1); }}>
            <option value="">Semua toko ({shopList.length})</option>
            {shopList.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
          </Select>
        )}
        <button onClick={sync} disabled={!!busy || !shopList.length} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50">
          {busy === "sync" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Sinkronkan pesanan
        </button>
      </PageHead>

      {shops && !shops.length && <Panel className="flex items-center gap-3 p-5 text-sm text-slate-600"><Store size={18} />Belum ada toko Shopee terhubung. <Link href="/marketplace/shops" className="font-semibold text-brand-600">Hubungkan toko</Link></Panel>}
      {notice && <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800"><Info size={16} className="mt-0.5 shrink-0" />{notice}</div>}

      <Panel className="px-5 pb-5 sm:px-6">
        {/* Status tabs */}
        <div className="-mx-5 flex gap-1 overflow-x-auto border-b border-slate-100 px-5 sm:-mx-6 sm:px-6">
          {TABS.map((t) => (
            <button key={t.key || "all"} onClick={() => pickTab(t.key)}
              className={`relative whitespace-nowrap px-3 py-4 text-sm transition ${tab === t.key ? "font-semibold text-brand-600" : "text-slate-600 hover:text-brand-600"}`}>
              {t.label}{t.count && counts[t.key] !== undefined ? ` (${counts[t.key]})` : ""}{t.key === "cancelled" ? ` (${attention.returns + attention.cancel_requests})` : ""}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>

        {/* Order type + sub-status */}
        <div className="space-y-3 pt-5 text-sm">
          {showKilat && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-slate-500">Tipe Pesanan</span>
              {tab !== "shipping" && <button onClick={() => { setKind(""); setPage(1); }} className={pill(kind === "")}>Semua</button>}
              <button onClick={() => { setKind("order"); setPage(1); }} className={pill(kind === "order")}>Pesanan ({split.order})</button>
              <button onClick={() => { setKind("kilat"); setPage(1); }} className={pill(kind === "kilat")}><span className="flex items-center gap-1.5"><KilatIcon size={15} />Pengiriman Kilat ({split.kilat})</span></button>
            </div>
          )}
          {tab === "shipping" && kind === "order" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-slate-500">Dikirim Dari</span>
              <button onClick={() => { setStock(""); setPage(1); }} className={pill(stock === "")}>Semua</button>
              <button onClick={() => { setStock("seller"); setPage(1); }} className={pill(stock === "seller")}>Dikirim dari stok Penjual ({stockCounts.seller})</button>
              <button onClick={() => { setStock("kilat"); setPage(1); }} className={pill(stock === "kilat")}>Dikirim dari stok Pengiriman Kilat ({stockCounts.kilat})</button>
            </div>
          )}
          {tab === "done" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-slate-500">Periode</span>
              <button onClick={() => { setDoneScope("today"); setPage(1); }} className={pill(doneScope === "today")}>Selesai hari ini</button>
              <button onClick={() => { setDoneScope("all"); setPage(1); }} className={pill(doneScope === "all")}>Semua</button>
            </div>
          )}
          {tab === "cancelled" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-slate-500">Jenis</span>
              <button onClick={() => { setRetTab("returns"); setPage(1); }} className={pill(retTab === "returns")}>Pengembalian Barang/Dana{attention.returns ? ` (${attention.returns})` : ""}</button>
              <button onClick={() => { setRetTab("pembatalan"); setPage(1); }} className={pill(retTab === "pembatalan")}>Pembatalan{attention.cancel_requests ? ` (${attention.cancel_requests})` : ""}</button>
            </div>
          )}
          {tab === "perlu_kirim" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-slate-500">Status Pesanan</span>
              {SUB.map(([k, l]) => <button key={k} onClick={() => { setSub(k); setPage(1); }} className={pill(sub === k)}>{l}{subCounts[k] !== undefined ? ` (${subCounts[k]})` : ""}</button>)}
            </div>
          )}

          {/* Search + courier */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex min-w-[300px] flex-1">
              <Select className="input h-10 w-52 shrink-0 rounded-r-none bg-slate-50" value={by} onChange={(e) => setBy(e.target.value)} aria-label="Cari berdasarkan">
                {SEARCH_BY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} onKeyDown={(e) => e.key === "Enter" && apply()}
                  placeholder={`Masukkan ${SEARCH_BY.find(([k]) => k === by)?.[1].toLowerCase()}`} className="input h-10 rounded-l-none border-l-0 pl-9" />
              </div>
            </div>
            {!showingReturns && <div className="flex min-w-[260px]">
              <span className="flex h-10 shrink-0 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">Jasa Kirim</span>
              <Select className="input h-10 flex-1 rounded-l-none" value={draft.courier || "all"} onChange={(e) => setDraft({ ...draft, courier: e.target.value === "all" ? "" : e.target.value })} aria-label="Jasa Kirim">
                <option value="all">Semua Jasa Kirim</option>
                {couriers.map((c) => <option key={c} value={c}>{cleanCourier(c)}</option>)}
              </Select>
            </div>}
            <button onClick={apply} className="h-10 rounded-lg border border-brand-500 px-5 text-sm font-semibold text-brand-600 hover:bg-brand-50">Terapkan</button>
            <button onClick={reset} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Atur Ulang</button>
          </div>
        </div>

        {showingReturns ? <ReturnsList data={returns} onPage={setPage} perPage={perPage} onPerPage={setPerPage} showShop={!shopId} /> : (<>
        {/* Result count, sort, mass actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-navy">{data ? `${total.toLocaleString("id-ID")} Pesanan` : "Memuat…"}</h2>
          <button onClick={() => { setDir(dir === "desc" ? "asc" : "desc"); setPage(1); }} className="ml-auto flex items-center gap-1.5 text-sm text-slate-600 hover:text-navy">
            <ArrowDownUp size={15} />Urutkan: Tanggal pesanan ({dir === "desc" ? "terbaru ke terlama" : "terlama ke terbaru"})
          </button>
          {state === "to_ship" && rows.some(needsShipping) && (
            <button onClick={() => setShipIds(rows.filter(needsShipping).map((o) => o.id))} className="flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><Truck size={15} />Atur Pengiriman Massal</button>
          )}
          {(state === "processed" || state === "advance") && (rows.some(canPrint) || printableBk.length > 0) && (
            <button onClick={() => printMixed(rows.filter(canPrint), printableBk)} disabled={!!busy} className="flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{busy === "print" ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}Cetak Resi Massal</button>
          )}
        </div>

        {(selected.length > 0 || selectedBk.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm">
            <b>{selected.length + selectedBk.length} dipilih{selectedBk.length > 0 ? ` (${selected.length} pesanan + ${selectedBk.length} Kilat)` : ""}</b>
            {shipChosen.length > 0 && <button onClick={() => setShipIds(shipChosen.map((o) => o.id))} className="flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"><Truck size={14} />Atur pengiriman ({shipChosen.length})</button>}
            {printChosen.length + chosenBk.length > 0 && <button onClick={() => printMixed(printChosen, chosenBk)} disabled={!!busy} className="flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">{busy === "print" ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}Cetak Resi Massal ({printChosen.length + chosenBk.length})</button>}
            <button onClick={() => { setSelected([]); setSelectedBk([]); }} className="ml-auto text-xs font-semibold text-slate-500 hover:text-navy">Batal pilih</button>
          </div>
        )}

        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[960px]">
            <div className={`${COLS} rounded-t-lg bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-500`}>
              <span className="flex items-center gap-3">
                {anySelectable && (
                  <input type="checkbox" aria-label="Pilih semua (pesanan & Pengiriman Kilat)" className="h-4 w-4 accent-brand-600"
                    checked={allChosen} ref={(el) => { if (el) el.indeterminate = (selected.length > 0 || selectedBk.length > 0) && !allChosen; }}
                    onChange={(e) => selectAll(e.target.checked)} />
                )}
                Produk
              </span><span>Dibayar Pembeli</span><span>Status · Batas Waktu Pengiriman</span><span>Jasa Kirim</span><span>Aksi</span>
            </div>

            <div className="mt-3 space-y-3">
              {page === 1 && bookings.map((b) => (
                <div key={`b${b.id}`} className={`overflow-hidden rounded-lg border ${selectedBk.includes(b.id) ? "border-teal-300 ring-1 ring-teal-200" : "border-slate-200"}`}>
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[13px]">
                    {b.booking_status === "PROCESSED" && <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={selectedBk.includes(b.id)} onChange={(e) => toggleBk(b.id, e.target.checked)} />}
                    <span className="flex items-center gap-1.5 text-slate-700"><Store size={14} className="text-slate-400" />Dibuat oleh Shopee</span>
                    <span className="flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-100"><KilatIcon size={13} />Pengiriman Kilat</span>
                    {!shopId && <span className="flex items-center gap-1 text-xs text-slate-400"><ShopeeMark size={12} />{b.marketplace_shop?.shop_name}</span>}
                    <span className="ml-auto text-slate-500">No. Reservasi <b className="font-medium text-slate-700">{b.booking_sn}</b>{b.order_sn && <> · No. Pesanan <b className="font-medium text-slate-700">{b.order_sn}</b></>}</span>
                  </div>
                  <div className={`${COLS} px-4 py-4 text-[13px]`}>
                    <Products items={(b.items ?? []) as Item[]} />
                    <div className="text-slate-400">-</div>
                    <div>
                      <p className="font-semibold text-navy">{b.booking_status === "SHIPPED" ? "Sudah Kirim" : "Perlu Dikirim"}</p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{b.booking_status === "SHIPPED" ? "Paket sedang dikirim." : "Kirim sebelum reservasi dibatalkan otomatis oleh Shopee."}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{cleanCourier(b.shipping_carrier)}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{b.tracking_number || "resi belum terbit"}</p>
                    </div>
                    <div className="space-y-2">
                      {b.booking_status === "PROCESSED" && <ActionLink icon={Printer} busy={busy === `kb${b.id}`} disabled={!!busy} onClick={() => printBookings([b])}>Cetak Label</ActionLink>}
                      {b.booking_status === "READY_TO_SHIP" && <a href="https://seller.shopee.co.id/portal/sale/order?type=toship" target="_blank" rel="noopener noreferrer" className="block text-[13px] font-medium text-sky-600 hover:underline">Atur di Seller Centre</a>}
                    </div>
                  </div>
                </div>
              ))}

              {rows.map((o) => {
                const [title, desc, tone] = statusText(o);
                const shipBy = o.custom_fields?.ship_by;
                const buyer = o.custom_fields?.buyer_username || o.customer_name;
                const selectable = needsShipping(o) || canPrint(o);
                const items = ((o.items ?? []) as Item[]).length ? (o.items as Item[]) : [{ name: o.variant ?? "Produk", qty: o.quantity } as Item];
                return (
                  <div key={o.id} className={`overflow-hidden rounded-lg border ${selected.includes(o.id) ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200"}`}>
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[13px]">
                      {selectable && <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={selected.includes(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} />}
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold uppercase text-slate-600">{(buyer || "?").slice(0, 1)}</span>
                      <span className="font-medium text-slate-700">{buyer}</span>
                      {!shopId && <span className="flex items-center gap-1 text-xs text-slate-400"><ShopeeMark size={12} />{o.marketplace_shop?.shop_name}</span>}
                      <span className="ml-auto text-slate-500">No. Pesanan <b className="font-medium text-slate-700">{o.external_order_sn}</b></span>
                    </div>
                    <div className={`${COLS} px-4 py-4 text-[13px]`}>
                      <Products items={items} />
                      <div>
                        <p className="font-semibold text-navy">{rupiah(o.total)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{o.payment_channel || (o.payment_status === "paid" ? "Sudah dibayar" : "Belum dibayar")}</p>
                      </div>
                      <div>
                        <p className={`font-semibold ${tone}`}>{title}</p>
                        <p className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</p>
                        {shipBy && ["READY_TO_SHIP", "PROCESSED", "RETRY_SHIP"].includes(o.external_status ?? "") && (
                          <p className={`mt-1.5 text-xs ${new Date(shipBy).getTime() - Date.now() < 864e5 ? "font-semibold text-rose-600" : "text-slate-600"}`}>Kirim sebelum {fmtShort(shipBy)}</p>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{o.courier_service || cleanCourier(o.courier)}</p>
                        {o.courier_service && <p className="mt-0.5 text-xs text-slate-500">{cleanCourier(o.courier)}</p>}
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{o.tracking_number || "resi belum terbit"}</p>
                      </div>
                      <div className="space-y-2">
                        {needsShipping(o) && <ActionLink icon={Truck} onClick={() => setShipIds([o.id])}>Atur Pengiriman</ActionLink>}
                        {canPrint(o) && <ActionLink icon={Printer} busy={busy === "print"} disabled={!!busy} onClick={() => print([o])}>Cetak Label</ActionLink>}
                        {awaitingAwb(o) && <ActionLink icon={RefreshCcw} busy={busy === `awb${o.id}`} onClick={async () => { setBusy(`awb${o.id}`); await refreshAwb([o.id], 1); setBusy(""); }}>Cek resi</ActionLink>}
                        {canTrack(o) && <ActionLink icon={PackageSearch} onClick={() => setTrack(o)}>Lacak Paket</ActionLink>}
                        <ActionLink icon={FileText} onClick={() => setDetail(o)}>Periksa Rincian</ActionLink>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {data && rows.length === 0 && bookings.length === 0 && (
              <div className="py-16 text-center"><PackageCheck size={40} className="mx-auto text-slate-200" /><p className="mt-3 text-sm text-slate-500">Pesanan Tidak Ditemukan</p></div>
            )}
            {!data && <p className="py-16 text-center text-sm text-slate-400">Memuat pesanan…</p>}
          </div>
        </div>
        {data && kind !== "kilat" && <div className="mt-4"><Pager page={data.current_page} last={data.last_page} onPage={setPage} total={data.total} perPage={perPage} onPerPage={setPerPage} /></div>}
        </>)}
      </Panel>

      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
      {track && <TrackingModal orderId={track.id} title={`Lacak · ${track.external_order_sn}`} onClose={() => setTrack(null)} />}
      {shipIds && <ShipModal orderIds={shipIds} onClose={() => setShipIds(null)} onDone={(m) => { const ids = shipIds; setShipIds(null); setNotice(m); load(); refreshAwb(ids); }} />}
    </div>
  );
}

/** Pengembalian Barang/Dana: return / refund requests, laid out like Seller Centre's list. */
function ReturnsList({ data, onPage, perPage, onPerPage, showShop }: { data: Paginated<ReturnReq> | null; onPage: (p: number) => void; perPage: number; onPerPage: (n: number) => void; showShop: boolean }) {
  const cols = "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-4";
  return (
    <>
      <h2 className="mt-6 text-lg font-bold text-navy">{data ? `${data.total.toLocaleString("id-ID")} Pengajuan` : "Memuat…"}</h2>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[960px]">
          <div className={`${cols} rounded-t-lg bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-500`}>
            <span>Produk</span><span>Jumlah Pengembalian Dana</span><span>Alasan Pengajuan</span><span>Status Pengajuan</span><span>Aksi</span>
          </div>
          <div className="mt-3 space-y-3">
            {(data?.data ?? []).map((r) => {
              const [label, tone] = RETURN_STATUS[r.status] ?? [r.status, "text-slate-600"];
              const open = r.status === "REQUESTED" || r.status === "PROCESSING";
              return (
                <div key={r.id} className={`overflow-hidden rounded-lg border ${open ? "border-rose-200" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[13px]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold uppercase text-slate-600">{(r.buyer_username || "?").slice(0, 1)}</span>
                    <span className="font-medium text-slate-700">{r.buyer_username || "-"}</span>
                    {showShop && <span className="flex items-center gap-1 text-xs text-slate-400"><ShopeeMark size={12} />{r.marketplace_shop?.shop_name}</span>}
                    <span className="text-slate-300">|</span><span className="text-slate-500">No. Pesanan <b className="font-medium text-slate-700">{r.order_sn}</b></span>
                    <span className="text-slate-300">|</span><span className="text-slate-500">No. Pengajuan <b className="font-medium text-slate-700">{r.return_sn}</b></span>
                  </div>
                  <div className={`${cols} px-4 py-4 text-[13px]`}>
                    <Products items={(r.items ?? []) as Item[]} />
                    <div><p className="text-xs text-slate-500">Pengembalian Dana</p><p className="font-semibold text-navy">{rupiah(r.refund_amount)}</p></div>
                    <div><p className="text-slate-700">{REASON[r.reason ?? ""] ?? r.reason ?? "-"}</p>{r.text_reason && <p className="mt-0.5 line-clamp-3 text-xs text-slate-500">“{r.text_reason}”</p>}</div>
                    <div>
                      <p className={`font-semibold ${tone}`}>{label}</p>
                      {open && r.due_at && <p className={`mt-0.5 text-xs ${new Date(r.due_at).getTime() - Date.now() < 2 * 864e5 ? "font-semibold text-rose-600" : "text-slate-500"}`}>Tanggapi sebelum {fmtShort(r.due_at)}</p>}
                      {r.tracking_number && <p className="mt-0.5 font-mono text-[11px] text-slate-400">Resi retur {r.tracking_number}</p>}
                    </div>
                    <div>
                      <a href="https://seller.shopee.co.id/portal/sale/returnrefundcancel" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-sky-600 hover:underline">{open ? "Tanggapi di Seller Centre" : "Lihat di Seller Centre"}</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {data && data.data.length === 0 && <div className="py-16 text-center"><PackageCheck size={40} className="mx-auto text-slate-200" /><p className="mt-3 text-sm text-slate-500">Tidak ada pengajuan pengembalian</p></div>}
          {!data && <p className="py-16 text-center text-sm text-slate-400">Memuat pengajuan…</p>}
        </div>
      </div>
      {data && <div className="mt-4"><Pager page={data.current_page} last={data.last_page} onPage={onPage} total={data.total} perPage={perPage} onPerPage={onPerPage} /></div>}
    </>
  );
}

/** "Periksa Rincian": buyer, address, items and money for one Shopee order. */
function OrderDetail({ order: o, onClose }: { order: Order; onClose: () => void }) {
  const [title, desc, tone] = statusText(o);
  const items = (o.items ?? []) as Item[];
  const rows: [string, string][] = [
    ["Subtotal produk", rupiah(o.subtotal)],
    ["Ongkos kirim", rupiah(o.shipping_cost)],
    ["Dibayar pembeli", rupiah(o.total)],
    ...(o.escrow_amount !== null ? [["Penghasilan (escrow)", rupiah(o.escrow_amount)] as [string, string]] : []),
  ];
  return (
    <Dialog title={`Rincian · ${o.external_order_sn}`} icon={FileText} onClose={onClose} width="max-w-2xl">
      <div className="space-y-5 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs text-slate-500">Status</p><p className={`font-semibold ${tone}`}>{title}</p><p className="text-xs text-slate-500">{desc}</p></div>
          <div><p className="text-xs text-slate-500">Waktu pesanan</p><p className="font-medium text-navy">{fmtShort(o.created_at)}</p>{o.paid_at && <p className="text-xs text-slate-500">Dibayar {fmtShort(o.paid_at)}</p>}</div>
          <div><p className="text-xs text-slate-500">Pembeli</p><p className="font-medium text-navy">{o.custom_fields?.buyer_username || "-"}</p><p className="text-xs text-slate-500">{o.customer_name} · {o.phone}</p></div>
          <div><p className="text-xs text-slate-500">Alamat</p><p className="text-slate-700">{o.address || "-"}</p></div>
          <div><p className="text-xs text-slate-500">Jasa kirim</p><p className="font-medium text-navy">{o.courier_service || cleanCourier(o.courier)}</p><p className="font-mono text-xs text-slate-500">{o.tracking_number || "resi belum terbit"}</p></div>
          <div><p className="text-xs text-slate-500">Pembayaran</p><p className="font-medium text-navy">{o.payment_channel || "-"}</p></div>
        </div>
        <div className="rounded-lg border border-slate-100 p-3"><Products items={items} /></div>
        <dl className="space-y-1.5 rounded-lg bg-slate-50 p-3">
          {rows.map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-slate-500">{l}</dt><dd className="font-semibold text-navy">{v}</dd></div>)}
        </dl>
      </div>
    </Dialog>
  );
}
