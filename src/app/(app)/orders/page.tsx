"use client";
import { ORDERS_EVENT } from "@/components/NotificationBell";
import { Archive, ArchiveRestore, BadgeCheck, Ban, CircleDollarSign, Download, Info, Mail, MessageCircle, MonitorDown, Package, PackageSearch, Plus, Printer, Receipt, Search, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { ChannelBadge, ShopeeMark } from "@/components/ChannelBadge";
import { TRAFFIC, trafficOf } from "@/lib/traffic";
import { ShippingStatus } from "@/components/ShippingStatus";
import { actionCell, RowAction } from "@/components/RowAction";
import { TrackingModal } from "@/components/TrackingModal";
import { DateRangePicker } from "@/components/DatePicker";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  api, ApiError, download, fmtDate, isoDate, Order, Paginated, PAY_STATUS_COLOR, PAY_STATUS_LABEL,
  PAYMENT_LABEL, Product, rupiah, SHIPPING_LABEL, STATUS_COLOR, STATUS_LABEL,
} from "@/lib/api";
import { CheckoutExtras, CheckoutForm, Store } from "@/components/CheckoutForm";
import { Empty, Field, Modal, Pagination, StatCard, Tabs } from "@/components/ui";
import { Select } from "@/components/Select";
import { askConfirm, showAlert } from "@/components/Dialogs";

/** Web-checkout labels can be printed while the parcel still waits for pickup. */
const canPrintWeb = (o: Order) => !!o.courier && o.shipping_status === "not_shipped" && !["cancelled", "refunded"].includes(o.status) && !o.is_abandoned;
const canTrackWeb = (o: Order) => !!o.tracking_number && !o.is_abandoned;
/** Booked through the seller's Biteship: a Biteship courier was chosen, not shipped yet, and COD or already paid. */
const canBiteship = (o: Order) => !!o.courier_code?.includes(":") && !o.shipping_ref && o.shipping_status === "not_shipped" && !o.is_abandoned
  && !["cancelled", "refunded"].includes(o.status) && (o.payment_method === "cod" || o.payment_status === "paid");
const labelUrl = (ids: number[]) => `/orders/labels?ids=${ids.join(",")}&auto=1`;

const TITLES: Record<string, string> = { all: "Pesanan Media Sosial", abandoned: "Checkout Ditinggalkan", archived: "Pesanan Diarsipkan" };
const COURIERS = ["JNE", "SiCepat", "SAP", "iDexpress", "J&T", "Lion Parcel", "SPX Express"];

/** Which follow-up template fits the order's current state. */
function suggestedTemplate(o: Order) {
  if (o.is_abandoned) return "followup_1";
  if (o.status === "completed" || o.shipping_status !== "not_shipped") return o.tracking_number ? "completed" : "upselling";
  if (o.status === "processing") return "processing";
  if (o.followup_count === 0) return "welcome";
  return `followup_${Math.min(5, o.followup_count)}`;
}

function Orders() {
  const sp = useSearchParams();
  const view = sp.get("view") ?? "all";
  const [type, setType] = useState<"physical" | "digital">("physical");
  const [filters, setFilters] = useState({
    search: sp.get("search") ?? "", product_id: "", status: sp.get("status") ?? "", payment_status: sp.get("payment_status") ?? "",
    payment_method: sp.get("payment_method") ?? "", courier: "", pickup: "", duplicates: "",
    channel: sp.get("channel") ?? "", marketplace_shop_id: "", traffic: "",
    from: isoDate(new Date(Date.now() - 29 * 864e5)), to: isoDate(new Date()),
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<{ orders: Paginated<Order>; stats: any } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [track, setTrack] = useState<Order | null>(null);
  const [biteship, setBiteship] = useState(false);
  const [shipping, setShipping] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  const query = useCallback(() => new URLSearchParams({ view, type, ...filters, page: String(page), per_page: String(perPage) }).toString(), [view, type, filters, page, perPage]);
  const load = useCallback(() => { api(`/orders?${query()}`).then(setData); setSelected([]); }, [query]);
  useEffect(() => { window.addEventListener(ORDERS_EVENT, load); return () => window.removeEventListener(ORDERS_EVENT, load); }, [load]);
  useEffect(() => { api("/integrations").then((d) => setBiteship(!!d.biteship?.connected)).catch(() => {}); }, []);
  async function shipBiteship(ids: number[]) {
    setShipping(ids); setNotice("");
    try {
      const r = await api("/orders/biteship-ship", { method: "POST", json: { order_ids: ids } });
      setNotice(`${r.shipped.length} pesanan dikirim lewat Biteship${r.shipped.length ? ` (resi: ${r.shipped.map((x: any) => x.waybill || "menunggu").join(", ")})` : ""}${r.failed.length ? `. ${r.failed.length} gagal: ${r.failed.map((f: any) => `${f.code} (${f.error})`).join("; ")}` : ""}.`);
      load();
    } catch (e) { setNotice(e instanceof ApiError ? e.message : "Gagal mengirim lewat Biteship"); }
    finally { setShipping([]); }
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api(`/products?per_page=100&type=${type}`).then((d) => setProducts(d.products.data)); }, [type]);
  useEffect(() => { setPage(1); }, [view]);

  const f = (k: keyof typeof filters, v: string) => { setFilters({ ...filters, [k]: v }); setPage(1); };
  const s = data?.stats;
  const ids = data?.orders.data.map((o) => o.id) ?? [];

  async function bulk(payload: Record<string, string>) {
    if (!selected.length) return;
    if (payload.action === "delete" && !(await askConfirm(`Hapus ${selected.length} pesanan?`))) return;
    await api("/orders/bulk", { method: "POST", json: { ids: selected, ...payload } });
    load();
  }

  const selectedOrders = data?.orders.data.filter((o) => selected.includes(o.id)) ?? [];

  async function followup(o: Order, event = suggestedTemplate(o)) {
    const { url } = await api(`/orders/${o.id}/followup`, { method: "POST", json: { event } });
    window.open(url, "_blank");
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title mr-auto">{TITLES[view]}</h1>
        <Select className="input w-48" value={filters.product_id} onChange={(e) => f("product_id", e.target.value)}>
          <option value="">Filter Product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <DateRangePicker value={{ from: filters.from, to: filters.to }} onChange={(r) => { setFilters({ ...filters, from: r.from, to: r.to }); setPage(1); }} />
        {view === "all" && <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} />Input Order</button>}
      </div>

      {view === "all" && <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Halaman ini khusus pesanan dari media sosial yang masuk melalui checkout Pesanin atau input manual. Pesanan marketplace dikelola terpisah di menu Marketplace → Pesanan & Pengiriman.
      </div>}

      {s && view !== "abandoned" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Orders" value={s.total_orders} icon={ShoppingBag} tone="brand" sub={`${s.ordered_items} item dipesan`} />
          <StatCard label="Total Paid" value={s.total_paid} icon={BadgeCheck} tone="emerald" sub={`Paid ratio ${s.paid_ratio}%`} />
          <StatCard label="Unpaid Orders" value={s.unpaid_orders} icon={CircleDollarSign} tone="rose" sub={`${s.refunded_orders} refunded`} />
          <StatCard label="Shipped Orders" value={s.shipped_orders} icon={Truck} tone="sky" sub={`${s.delivered_orders} diterima`} />
        </div>
      )}
      {notice && <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 ring-1 ring-brand-100" onClick={() => setNotice("")}><Info size={16} className="mt-0.5 shrink-0" />{notice}</div>}

      <div className="card">
        <div className="border-b border-slate-100 px-4 pt-4">
          <Tabs value={type} onChange={(t) => { setType(t); setPage(1); }} items={[{ value: "physical", label: "Produk Fisik", icon: Package }, { value: "digital", label: "Produk Digital", icon: MonitorDown }]} />
        </div>
        {view === "all" && type === "physical" && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
            {[["", "Semua Medsos"], ["website", "Checkout Medsos"], ["manual", "Input manual"]].map(([v, l]) => (
              <button key={v} onClick={() => setFilters({ ...filters, channel: v, marketplace_shop_id: "", traffic: "" })}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition ${filters.channel === v ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {l}
              </button>
            ))}
            {filters.channel === "website" && (
              <Select className="input h-9 w-56" value={filters.traffic} onChange={(e) => f("traffic", e.target.value)}>
                <option value="">Semua sumber traffic</option>
                {Object.entries(TRAFFIC).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </Select>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari nama, no. HP, ID, resi" value={filters.search} onChange={(e) => f("search", e.target.value)} />
          </div>
          {view !== "abandoned" && (
            <>
              <Select className="input w-36" value={filters.status} onChange={(e) => f("status", e.target.value)}>
                <option value="">Status Order</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Select className="input w-36" value={filters.payment_status} onChange={(e) => f("payment_status", e.target.value)}>
                <option value="">Status Bayar</option>
                {Object.entries(PAY_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Select className="input w-40" value={filters.payment_method} onChange={(e) => f("payment_method", e.target.value)}>
                <option value="">Metode Bayar</option>
                {Object.entries(PAYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              {type === "physical" && (
                <>
                  <Select className="input w-32" value={filters.courier} onChange={(e) => f("courier", e.target.value)}>
                    <option value="">Courier</option>{COURIERS.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                  <Select className="input w-40" value={filters.pickup} onChange={(e) => f("pickup", e.target.value)}>
                    <option value="">Pickup Status</option><option value="picked">Picked Up Orders</option><option value="none">No Pickup</option>
                  </Select>
                </>
              )}
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600"><input type="checkbox" className="accent-brand-600" checked={!!filters.duplicates} onChange={(e) => f("duplicates", e.target.checked ? "1" : "")} />Cek Duplikasi</label>
            </>
          )}
          <button className="btn-outline ml-auto" onClick={() => download(`/orders/export?${query()}`, "orders.csv")}><Download size={16} />Export</button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-y border-brand-100 bg-brand-50 px-4 py-2 text-sm">
            <b>{selected.length} dipilih</b>
            {view !== "abandoned" && (
              <>
                <Select className="input h-8 w-40" value="" onChange={(e) => {
                  const [k, v] = e.target.value.split(":");
                  if (k) bulk({ [k]: v });
                }}>
                  <option value="">Atur Status…</option>
                  <optgroup label="Mark as">
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={`status:${k}`}>{v}</option>)}
                    <option value="payment_status:unpaid">Unpaid</option>
                    <option value="payment_status:paid">Paid</option>
                  </optgroup>
                </Select>
              </>
            )}
            {biteship && selectedOrders.some(canBiteship) && <RowAction wide={false} tone="shopee" icon={Truck} busy={shipping.length > 1} onClick={() => shipBiteship(selectedOrders.filter(canBiteship).map((o) => o.id))}>Kirim via Biteship ({selectedOrders.filter(canBiteship).length})</RowAction>}
            {selectedOrders.some(canPrintWeb) && <RowAction wide={false} tone="primary" icon={Printer} href={labelUrl(selectedOrders.filter(canPrintWeb).map((o) => o.id))}>Cetak resi ({selectedOrders.filter(canPrintWeb).length})</RowAction>}
            {view === "all" && <button className="btn-outline btn-sm" onClick={() => bulk({ action: "archive" })}><Archive size={14} />Arsipkan</button>}
            {view === "archived" && <button className="btn-outline btn-sm" onClick={() => bulk({ action: "unarchive" })}><ArchiveRestore size={14} />Kembalikan</button>}
            <button className="btn-danger btn-sm" onClick={() => bulk({ action: "delete" })}><Trash2 size={14} />Hapus</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/60">
              <tr>
                <th className="th w-8"><input type="checkbox" checked={ids.length > 0 && selected.length === ids.length} onChange={(e) => setSelected(e.target.checked ? ids : [])} /></th>
                {["Date", "ID Pesanan", "Sumber", "Courier", "Name", "City", "Produk", "Gross Revenue", "Status", "Payment Status", ...(type === "physical" ? ["Pengiriman"] : []), "Followup WhatsApp", "Kampanye (UTM)"].map((h) => <th key={h} className="th">{h}</th>)}
                <th className={`${actionCell} bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.orders.data.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(o)}>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))} />
                  </td>
                  <td className="td text-slate-500">{fmtDate(o.created_at)}</td>
                  <td className="td font-mono text-xs">{o.code}</td>
                  <td className="td"><ChannelBadge channel={o.channel} shop={o.marketplace_shop?.shop_name} utm={o.utm_source} /></td>
                  <td className="td">{o.courier ? <>{o.courier}{o.courier_service ? `-${o.courier_service}` : ""}<div className="text-xs text-slate-500">{o.tracking_number ?? "belum ada resi"}</div>{!o.tracking_number && o.auto_ship_error && <div className="max-w-[200px] truncate text-[11px] text-rose-600" title={o.auto_ship_error}>Resi otomatis gagal: {o.auto_ship_error}</div>}</> : o.product?.type === "digital" ? <span className={`text-xs ${o.digital_sent_at ? "text-emerald-700" : "text-slate-400"}`}>{o.digital_sent_at ? "Produk terkirim" : "Digital"}</span> : "-"}</td>
                  <td className="td"><div className="font-medium">{o.customer_name || "-"}</div><div className="text-xs text-slate-500">{o.phone}</div></td>
                  <td className="td">{o.city ? <>{o.city}<div className="text-xs text-slate-500">{o.district}</div></> : "-"}</td>
                  <td className="td">{o.channel === "shopee" && o.items?.length
                    ? o.items.map((i, k) => <div key={k} className="max-w-[240px] truncate">{i.name}{i.variant ? ` (${i.variant})` : ""} × {i.qty}</div>)
                    : <>{o.product?.name}{o.variant ? ` (${o.variant})` : ""} × {o.quantity}</>}</td>
                  <td className="td font-medium">{rupiah(o.total)}</td>
                  <td className="td">{o.is_abandoned ? <span className="badge bg-orange-100 text-orange-700">Abandoned</span> : <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>}</td>
                  <td className="td"><span className={`badge ${PAY_STATUS_COLOR[o.payment_status]}`}>{PAY_STATUS_LABEL[o.payment_status]}</span><div className="text-xs text-slate-500">{o.payment_method ? PAYMENT_LABEL[o.payment_method] : "-"}</div></td>
                  {type === "physical" && (
                    <td className="td" onClick={(e) => e.stopPropagation()}>
                      {o.courier ? <ShippingStatus status={o.shipping_status} compact /> : <span className="text-xs text-slate-400">-</span>}
                    </td>
                  )}
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-outline btn-sm text-emerald-700" onClick={() => followup(o)} title="Kirim template yang sesuai status"><MessageCircle size={13} />{o.followup_count}×</button>
                  </td>
                  <td className="td text-xs">{o.channel === "website" && o.utm_campaign ? <><span className="font-medium text-slate-700">{o.utm_campaign}</span><div className="text-slate-400">{TRAFFIC[trafficOf(o.utm_source)].short}</div></> : "-"}</td>
                  <td className={actionCell} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5">
                      {biteship && canBiteship(o) && <RowAction tone="shopee" icon={Truck} busy={shipping.includes(o.id)} onClick={() => shipBiteship([o.id])}>Kirim (Biteship)</RowAction>}
                      {canPrintWeb(o) && <RowAction tone="primary" icon={Printer} href={labelUrl([o.id])}>Cetak resi</RowAction>}
                      {canTrackWeb(o) && <RowAction icon={PackageSearch} onClick={() => setTrack(o)}>Lacak resi</RowAction>}
                      {!canPrintWeb(o) && !canTrackWeb(o) && <span className="block text-center text-xs text-slate-300">-</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.orders.data.length === 0 && <Empty icon={ShoppingBag} text="Pesanan yang kamu cari tidak ditemukan." />}
        </div>
        {data && <Pagination page={data.orders.current_page} last={data.orders.last_page} onChange={setPage} total={data.orders.total} perPage={perPage} onPerPage={setPerPage} />}
      </div>

      {track && <TrackingModal orderId={track.id} title={`Lacak resi · ${track.code}`} onClose={() => setTrack(null)} />}
      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} onSaved={() => { setDetail(null); load(); }} />}
      {creating && <InputOrder onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function OrderDetail({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: () => void }) {
  const [o, setO] = useState(order);
  const [templates, setTemplates] = useState<{ event: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api("/followup-templates").then(setTemplates); }, []);
  const set = (k: keyof Order, v: any) => setO({ ...o, [k]: v });
  const suggested = suggestedTemplate(o);

  async function save() {
    setSaving(true);
    try {
      await api(`/orders/${o.id}`, { method: "PUT", json: {
        status: o.status, payment_status: o.payment_status, shipping_status: o.shipping_status, tracking_number: o.tracking_number,
        notes: o.notes, customer_name: o.customer_name, phone: o.phone, address: o.address,
      } });
      onSaved();
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal menyimpan", "Gagal");
    } finally {
      setSaving(false);
    }
  }

  async function followup(event: string) {
    const { url } = await api(`/orders/${o.id}/followup`, { method: "POST", json: { event } });
    window.open(url, "_blank");
    set("followup_count", o.followup_count + 1);
  }

  async function ban() {
    if (!(await askConfirm(`Blokir nomor ${o.phone}? Pesanan dari nomor ini akan ditolak.`))) return;
    await api("/banned-devices", { method: "POST", json: { type: "phone", value: o.phone, reason: `Pesanan ${o.code}` } });
    showAlert("Nomor diblokir.", "Berhasil");
  }

  const [digi, setDigi] = useState("");
  async function sendDigital() {
    setDigi("…");
    try {
      const r = await api<{ sent: string[]; errors: string[]; url: string; order: Order }>(`/orders/${o.id}/digital-send`, { method: "POST" });
      setO({ ...o, digital_token: r.order.digital_token, digital_sent_at: r.order.digital_sent_at, digital_error: r.order.digital_error, status: r.order.status });
      setDigi(r.sent.length ? `Terkirim lewat ${r.sent.join(" & ")}.` : "Link akses siap. Salin lalu kirim ke pembeli." + (r.errors.length ? ` (${r.errors.join("; ")})` : ""));
      onSaved();
    } catch (e) { setDigi(e instanceof ApiError ? e.message : "Gagal mengirim"); }
  }
  const accessUrl = o.digital_token ? `${typeof window === "undefined" ? "" : window.location.origin}/d/${o.digital_token}` : null;

  return (
    <Modal open onClose={onClose} title={`Pesanan ${o.code}`} icon={Receipt} wide>
      {o.product?.type === "digital" && (
        <div className="mb-5 space-y-2 rounded-xl bg-violet-50 p-4 text-sm">
          <p className="font-semibold text-navy">Produk digital</p>
          <p className="text-slate-600">{o.digital_sent_at ? `Dikirim ke pembeli ${new Date(o.digital_sent_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : o.payment_status === "paid" ? "Sedang dikirim otomatis (±30 detik)." : "Dikirim otomatis begitu pesanan lunas."}</p>
          {o.digital_error && <p className="text-xs text-rose-600">{o.digital_error}</p>}
          {accessUrl && <div className="flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs">{accessUrl}</code>
            <button type="button" onClick={() => { navigator.clipboard.writeText(accessUrl); setDigi("Link disalin."); }} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy">Salin</button></div>}
          {o.payment_status === "paid" && <button type="button" onClick={sendDigital} disabled={digi === "…"} className="h-9 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white disabled:opacity-60">{o.digital_sent_at ? "Kirim ulang ke pembeli" : "Kirim sekarang"}</button>}
          {digi && digi !== "…" && <p className="text-xs text-slate-600">{digi}</p>}
        </div>
      )}
      {o.courier && (
        <div className="mb-5 rounded-xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-navy">Status pengiriman</p>
          <ShippingStatus status={o.shipping_status} tracking={o.tracking_number} courier={[o.courier, o.courier_service].filter(Boolean).join(" ")} />
        </div>
      )}
      {o.channel === "shopee" && (
        <div className="mb-5 rounded-xl bg-[#fff6f4] p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ChannelBadge channel="shopee" shop={o.marketplace_shop?.shop_name} />
            <span className="font-mono text-xs text-slate-500">No. pesanan {o.external_order_sn}</span>
            <span className="badge ml-auto bg-white text-slate-600">{o.external_status}</span>
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {(o.items ?? []).map((i, k) => <div key={k} className="flex justify-between gap-3 sm:col-span-2"><span>{i.name}{i.variant ? ` · ${i.variant}` : ""} × {i.qty}</span><span>{rupiah(i.qty * i.price)}</span></div>)}
            <div className="flex justify-between border-t border-[#f6d5cc] pt-1.5 sm:col-span-2"><span className="text-slate-500">Subtotal produk</span><span>{rupiah(o.subtotal)}</span></div>
            <div className="flex justify-between sm:col-span-2"><span className="text-slate-500">Potongan Shopee (komisi, layanan, transaksi)</span><span className="text-rose-600">−{rupiah(o.marketplace_fee)}</span></div>
            {o.seller_shipping_fee > 0 && <div className="flex justify-between sm:col-span-2"><span className="text-slate-500">Ongkir ditanggung penjual</span><span className="text-rose-600">−{rupiah(o.seller_shipping_fee)}</span></div>}
            <div className="flex justify-between font-semibold text-navy sm:col-span-2"><span>Penghasilan dari Shopee</span><span>{o.escrow_amount !== null ? rupiah(o.escrow_amount) : "Belum final (menunggu dana dilepas)"}</span></div>
          </div>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Nama"><input className="input" value={o.customer_name ?? ""} onChange={(e) => set("customer_name", e.target.value)} /></Field>
          <Field label="No. WhatsApp"><input className="input" value={o.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          {o.product?.type !== "digital" && (
            <Field label="Alamat"><textarea className="textarea" rows={2} value={o.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
          )}
          {o.city && <p className="text-sm text-slate-600">{[o.district, o.city, o.province].filter(Boolean).join(", ")}</p>}
          {o.email && <p className="flex items-center gap-1.5 text-sm text-slate-600"><Mail size={14} />{o.email}</p>}
          <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span>{o.product?.name}{o.variant ? ` (${o.variant})` : ""} × {o.quantity}</span><span>{rupiah(o.unit_price * o.quantity)}</span></div>
            {o.bump_items?.length ? o.bump_items.map((b) => <div key={b.product_id} className="flex justify-between"><span>+ {b.name}</span><span>{rupiah(b.price)}</span></div>)
              : o.bump_selected && <div className="flex justify-between"><span>Bump</span><span>{rupiah(o.bump_price)}</span></div>}
            {o.courier && <div className="flex justify-between"><span>Ongkir {o.courier}-{o.courier_service} ({(o.weight / 1000).toLocaleString("id-ID")}kg)</span><span>{rupiah(o.shipping_cost)}</span></div>}
            {o.cod_fee > 0 && <div className="flex justify-between"><span>Biaya COD</span><span>{rupiah(o.cod_fee)}</span></div>}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><span>Total</span><span>{rupiah(o.total)}</span></div>
            <div className="pt-1 text-xs text-slate-500">{o.payment_method ? PAYMENT_LABEL[o.payment_method] : "-"} • {fmtDate(o.created_at)}{o.shipping_etd ? ` • estimasi ${o.shipping_etd}` : ""}</div>
            {o.notes && <div className="text-xs"><b>Catatan:</b> {o.notes}</div>}
            {o.custom_fields && Object.entries(o.custom_fields).map(([k, v]) => <div key={k} className="text-xs"><b>{k}:</b> {v}</div>)}
            {(o.utm_source || o.utm_campaign) && <div className="text-xs text-slate-500">UTM: {[o.utm_source, o.utm_medium, o.utm_campaign].filter(Boolean).join(" / ")}</div>}
          </div>
        </div>
        <div className="space-y-3">
          {!o.is_abandoned && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status Order">
                  <Select className="input" value={o.status} onChange={(e) => set("status", e.target.value)}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Status Pembayaran">
                  <Select className="input" value={o.payment_status} onChange={(e) => set("payment_status", e.target.value)}>
                    {Object.entries(PAY_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
              </div>
              <p className="text-xs text-slate-500">Menandai <b>Paid</b> pada pesanan Pending otomatis memindahkannya ke <b>Processing</b>. Cancelled/Refunded mengembalikan stok.</p>
              <Field label="Catatan Internal"><textarea className="textarea" rows={2} value={o.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </>
          )}
          <div>
            <label className="label">Follow Up WhatsApp ({o.followup_count}× terkirim)</label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button key={t.event} className={`btn-sm ${t.event === suggested ? "btn-primary" : "btn-outline"}`} onClick={() => followup(t.event)}><MessageCircle size={13} />{t.name}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <button className="btn-ghost btn-sm text-rose-600" onClick={ban}><Ban size={14} />Blokir nomor</button>
            {!o.is_abandoned && <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan…" : "Simpan Perubahan"}</button>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Input Order: choose product (+ checkout page), then fill the same checkout form. */
function InputOrder({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [all, setAll] = useState<Product[]>([]);
  const [chosen, setChosen] = useState<({ product: Product; payment_methods: string[]; store: Store } & CheckoutExtras) | null>(null);
  useEffect(() => { api("/products?per_page=100&status=active&type=physical").then((a) =>
    api("/products?per_page=100&status=active&type=digital").then((b) => setAll([...a.products.data, ...b.products.data]))); }, []);

  async function choose(id: string) {
    const p = all.find((x) => x.id === Number(id));
    if (!p) return setChosen(null);
    setChosen(await api(`/public/products/${p.slug}?preview=1`));
  }

  return (
    <Modal open onClose={onClose} title="Input Order" icon={Plus} wide>
      <div className="space-y-4">
        <Field label="Produk">
          <Select className="input" defaultValue="" onChange={(e) => choose(e.target.value)}>
            <option value="">Pilih produk</option>
            {all.map((p) => <option key={p.id} value={p.id}>{p.name} {p.type === "digital" ? "(digital)" : ""}</option>)}
          </Select>
        </Field>
        {chosen && (
          <CheckoutForm key={chosen.product.id} product={chosen.product} methods={chosen.payment_methods} store={chosen.store} extras={chosen} manual onDone={onDone} />
        )}
      </div>
    </Modal>
  );
}

export default function Page() {
  return <Suspense><Orders /></Suspense>;
}
