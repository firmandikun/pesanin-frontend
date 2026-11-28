"use client";
import { ORDERS_EVENT } from "@/components/NotificationBell";
import { Archive, ArchiveRestore, BadgeCheck, Ban, BarChart3, CheckCircle2, Headset, CircleDollarSign, Download, Info, Mail, MessageCircle, MonitorDown, Package, PackageSearch, Plus, Printer, Receipt, Search, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { ChannelBadge, ShopeeMark } from "@/components/ChannelBadge";
import { TRAFFIC, trafficOf } from "@/lib/traffic";
import { ShippingStatus } from "@/components/ShippingStatus";
import { actionCell, RowAction } from "@/components/RowAction";
import { TrackingModal } from "@/components/TrackingModal";
import { DateRangePicker, todayRange } from "@/components/DatePicker";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  api, ApiError, type CodRisk, download, fmtDate, isoDate, Order, Paginated, PAY_STATUS_COLOR, PAY_STATUS_LABEL,
  PAYMENT_LABEL, Product, rupiah, SHIPPING_LABEL, STATUS_COLOR, STATUS_LABEL,
} from "@/lib/api";
import { CheckoutExtras, CheckoutForm, Store } from "@/components/CheckoutForm";
import { FollowupQueue } from "@/components/FollowupQueue";
import { Empty, Field, Modal, Pagination, StatCard, Tabs } from "@/components/ui";
import { Select } from "@/components/Select";
import { askConfirm, askText, showAlert } from "@/components/Dialogs";

/** Web-checkout labels can be printed while the parcel still waits for pickup. */
const canPrintWeb = (o: Order) => !!o.courier && o.shipping_status === "not_shipped" && !["cancelled", "refunded"].includes(o.status) && !o.is_abandoned && !o.is_dropship && !o.locked;
const canTrackWeb = (o: Order) => !!o.tracking_number && !o.is_abandoned;
/** Ready to hand over: a courier was chosen, not shipped yet, COD or already paid. Dropship orders are shipped by the Pesanin warehouse. */
/** Booked with KiriminAja, resi not issued yet (it comes by webhook / the 10-minute check). */
const awaitingResi = (o: Order) => o.shipping_provider === "kiriminaja" && !!o.shipping_ref && !o.tracking_number;
const canInputResi = (o: Order) => !!o.courier && o.shipping_status === "not_shipped" && !o.is_abandoned && !o.is_dropship && !awaitingResi(o)
  && !["cancelled", "refunded"].includes(o.status) && (o.payment_method === "cod" || o.payment_status === "paid");
const labelUrl = (ids: number[]) => `/orders/labels?ids=${ids.join(",")}&auto=1`;

const TITLES: Record<string, string> = { all: "Pesanan Media Sosial", abandoned: "Checkout Ditinggalkan", archived: "Pesanan Diarsipkan" };
const COURIERS = ["JNE", "SiCepat", "SAP", "iDexpress", "J&T", "Lion Parcel", "SPX Express"];

/** Konfirmasi COD status: label and badge colour. */
const COD_CONFIRM: Record<string, [string, string]> = {
  waiting: ["Menunggu konfirmasi", "bg-amber-50 text-amber-700"], confirmed: ["COD dikonfirmasi", "bg-emerald-50 text-emerald-700"],
  declined: ["Pembeli batal", "bg-rose-50 text-rose-700"], no_reply: ["Tidak membalas", "bg-rose-50 text-rose-700"],
  failed: ["WA gagal terkirim", "bg-slate-100 text-slate-600"], skipped: ["Tanpa konfirmasi", "bg-slate-100 text-slate-500"],
};

function CodConfirmBadge({ o, always }: { o: Order; always?: boolean }) {
  const c = o.cod_confirm_status ? COD_CONFIRM[o.cod_confirm_status] : null;
  if (!c) return always ? <span className="badge bg-slate-100 text-slate-500">Belum dikonfirmasi</span> : null;
  if (o.cod_confirm_status === "skipped" && !always) return null;
  return <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${c[1]}`}>{c[0]}</span>;
}

type CsOption = { id: number; name: string; is_active?: boolean };

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
    payment_method: sp.get("payment_method") ?? "", courier: "", pickup: "", duplicates: "", cs_staff_id: "", cod_confirm: sp.get("cod_confirm") ?? "",
    channel: sp.get("channel") ?? "", marketplace_shop_id: "", traffic: "",
    ...todayRange(),
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<{ orders: Paginated<Order>; stats: any } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [track, setTrack] = useState<Order | null>(null);
  const [bookTarget, setBookTarget] = useState<Order | null>(null);
  const [shipping, setShipping] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [staff, setStaff] = useState<CsOption[]>([]);
  const [csReport, setCsReport] = useState(false);
  const [fuQueue, setFuQueue] = useState(false);
  useEffect(() => { api<{ data: CsOption[] }>("/r/staff?per_page=100").then((r) => setStaff(r.data ?? [])).catch(() => {}); }, []);

  const query = useCallback(() => new URLSearchParams({ view, type, ...filters, page: String(page), per_page: String(perPage) }).toString(), [view, type, filters, page, perPage]);
  const load = useCallback(() => { api(`/orders?${query()}`).then(setData); setSelected([]); }, [query]);
  // "Cek resi": ask KiriminAja's tracking now instead of waiting for the webhook / the 10-minute check.
  const [checking, setChecking] = useState<number | null>(null);
  const checkResi = async (o: Order) => {
    setChecking(o.id);
    try {
      const t = await api<{ tracking_number?: string | null }>(`/orders/${o.id}/tracking`);
      if (t.tracking_number) { showAlert(`Resi terbit: ${t.tracking_number}`, "Resi KiriminAja"); load(); }
      else showAlert("Resi belum diterbitkan kurir. Biasanya beberapa menit setelah pesan kurir (di sandbox, setelah status disimulasikan). Pesanin juga mengecek otomatis tiap 10 menit.", "Belum ada resi");
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal mengecek resi", "Gagal"); } finally { setChecking(null); }
  };
  useEffect(() => { window.addEventListener(ORDERS_EVENT, load); return () => window.removeEventListener(ORDERS_EVENT, load); }, [load]);
  const [booking, setBooking] = useState(false);
  useEffect(() => { api("/integrations").then((d) => setBooking(!!(d.kiriminaja ?? d.rajaongkir)?.settings?.delivery?.enabled)).catch(() => {}); }, []);
  /** "Pesan kurir": KiriminAja books the courier pickup and returns the real waybill. */
  async function bookCourier(ids: number[], extra?: BookExtra) {
    setShipping(ids); setNotice("");
    try {
      const r = await api("/orders/book", { method: "POST", json: { order_ids: ids, ...(extra ?? {}) } });
      setNotice(`${r.shipped.length} pesanan dipesankan kurir${r.shipped.length ? ` (resi: ${r.shipped.map((x: any) => x.waybill).join(", ")})` : ""}${r.failed.length ? `. ${r.failed.length} gagal: ${r.failed.map((f: any) => `${f.code} (${f.error})`).join("; ")}` : ""}.`);
      setBookTarget(null);
      load();
    } catch (e) { setNotice(e instanceof ApiError ? e.message : "Gagal memesan kurir"); }
    finally { setShipping([]); }
  }
  /** After handing the parcel to the courier: save the waybill, it is then tracked through RajaOngkir. */
  async function inputResi(o: Order) {
    const resi = (await askText(`Nomor resi ${o.code}`, o.tracking_number ?? "", `Kurir: ${o.courier ?? "-"}${o.courier_service ? ` ${o.courier_service}` : ""}. Isi setelah paket diserahkan ke kurir.`))?.trim();
    if (!resi) return;
    setShipping([o.id]); setNotice("");
    try {
      await api(`/orders/${o.id}`, { method: "PUT", json: { tracking_number: resi, shipping_status: "in_transit" } });
      setNotice(`${o.code}: resi ${resi} disimpan, status pengiriman dilacak otomatis.`);
      load();
    } catch (e) { setNotice(e instanceof ApiError ? e.message : "Gagal menyimpan resi"); }
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
    const r = await api<{ via: "api" | "manual"; url: string | null }>(`/orders/${o.id}/followup`, { method: "POST", json: { event } });
    if (r.url) window.open(r.url, "_blank"); else setNotice(`${o.code}: follow up terkirim otomatis lewat WhatsApp bisnis (gratis, pembeli chat dalam 24 jam terakhir).`);
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
        {view === "all" && <button className="btn-outline" onClick={() => setFuQueue(true)} title="Kirim follow up WhatsApp satu per satu, pesan sudah terisi"><MessageCircle size={16} />Antrean Follow Up</button>}
        {view === "all" && staff.length > 0 && <button className="btn-outline" onClick={() => setCsReport(true)}><BarChart3 size={16} />Kinerja CS</button>}
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
              {filters.payment_method === "cod" && (
                <Select className="input w-44" value={filters.cod_confirm} onChange={(e) => f("cod_confirm", e.target.value)}>
                  <option value="">Konfirmasi COD</option>{Object.entries(COD_CONFIRM).filter(([k]) => k !== "skipped").map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              )}
              {staff.length > 0 && (
                <Select className="input w-40" value={filters.cs_staff_id} onChange={(e) => f("cs_staff_id", e.target.value)}>
                  <option value="">Semua CS</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value="none">Tanpa CS</option>
                </Select>
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
            {booking && selectedOrders.some((o) => canInputResi(o) && !o.locked) && <RowAction wide={false} tone="shopee" icon={Truck} busy={shipping.length > 1} onClick={() => bookCourier(selectedOrders.filter((o) => canInputResi(o) && !o.locked).map((o) => o.id))}>Pesan kurir ({selectedOrders.filter((o) => canInputResi(o) && !o.locked).length})</RowAction>}
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
                {["Date", "ID Pesanan", "Sumber", "Courier", "Name", "City", "Produk", "Gross Revenue", "Status", "Payment Status", ...(type === "physical" ? ["Pengiriman"] : []), "CS & Followup", "Kampanye (UTM)"].map((h) => <th key={h} className="th">{h}</th>)}
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
                  <td className="td font-mono text-xs">{o.code}
                    {o.is_dropship && <span title="Dikirim oleh gudang Pesanin; resi terisi otomatis setelah dikirim" className="mt-1 block w-fit rounded bg-violet-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-violet-700">Dropship · gudang Pesanin</span>}
                    {o.locked && <a href="/settings/billing" title="Melewati kuota pesanan bulan ini. Upgrade paket untuk membuka data pembeli." className="mt-1 block w-fit rounded bg-amber-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-amber-700">Terkunci · upgrade</a>}
                  </td>
                  <td className="td"><ChannelBadge channel={o.channel} shop={o.marketplace_shop?.shop_name} utm={o.utm_source} /></td>
                  <td className="td">{o.courier ? <>{o.courier}{o.courier_service ? `-${o.courier_service}` : ""}<div className="text-xs text-slate-500">{o.tracking_number ?? (awaitingResi(o) ? <span className="font-semibold text-amber-600">Menunggu resi KiriminAja</span> : "belum ada resi")}</div>{!o.tracking_number && o.auto_ship_error && <div className="max-w-[200px] truncate text-[11px] text-rose-600" title={o.auto_ship_error}>Resi otomatis gagal: {o.auto_ship_error}</div>}</> : o.product?.type === "digital" ? <span className={`text-xs ${o.digital_sent_at ? "text-emerald-700" : "text-slate-400"}`}>{o.digital_sent_at ? "Produk terkirim" : "Digital"}</span> : "-"}</td>
                  <td className="td"><div className="font-medium">{o.customer_name || "-"}</div><div className="text-xs text-slate-500">{o.phone}</div></td>
                  <td className="td">{o.city ? <>{o.city}<div className="text-xs text-slate-500">{o.district}</div></> : "-"}</td>
                  <td className="td">{o.channel === "shopee" && o.items?.length
                    ? o.items.map((i, k) => <div key={k} className="max-w-[240px] truncate">{i.name}{i.variant ? ` (${i.variant})` : ""} × {i.qty}</div>)
                    : <>{o.product?.name}{o.variant ? ` (${o.variant})` : ""} × {o.quantity}</>}</td>
                  <td className="td font-medium">{rupiah(o.total)}</td>
                  <td className="td">{o.is_abandoned ? <span className="badge bg-orange-100 text-orange-700">Abandoned</span> : <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>}</td>
                  <td className="td"><span className={`badge ${PAY_STATUS_COLOR[o.payment_status]}`}>{PAY_STATUS_LABEL[o.payment_status]}</span><div className="text-xs text-slate-500">{o.payment_method ? PAYMENT_LABEL[o.payment_method] : "-"}</div>{o.cod_risk && o.cod_risk.level !== "low" && <CodRiskBadge risk={o.cod_risk} />}{o.payment_method === "cod" && <CodConfirmBadge o={o} />}</td>
                  {type === "physical" && (
                    <td className="td" onClick={(e) => e.stopPropagation()}>
                      {o.courier ? <ShippingStatus status={o.shipping_status} compact /> : <span className="text-xs text-slate-400">-</span>}
                    </td>
                  )}
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    {o.cs_staff && <div className="mb-1 flex items-center gap-1 whitespace-nowrap text-xs font-medium text-slate-700" title={o.cs_contacted_at ? "Pembeli sudah dihubungi" : "Belum dihubungi CS"}>
                      <Headset size={12} className="text-slate-400" />{o.cs_staff.name}{o.cs_contacted_at ? <CheckCircle2 size={12} className="text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}</div>}
                    <button className="btn-outline btn-sm text-emerald-700" onClick={() => followup(o)} title="Kirim template yang sesuai status"><MessageCircle size={13} />{o.followup_count}×</button>
                  </td>
                  <td className="td text-xs">{o.channel === "website" && o.utm_campaign ? <><span className="font-medium text-slate-700">{o.utm_campaign}</span><div className="text-slate-400">{TRAFFIC[trafficOf(o.utm_source)].short}</div></> : "-"}</td>
                  <td className={actionCell} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5">
                      <RowAction icon={Info} onClick={() => setDetail(o)}>Detail</RowAction>
                      {canInputResi(o) && booking && !o.locked && <RowAction tone="shopee" icon={Truck} busy={shipping.includes(o.id)} onClick={() => setBookTarget(o)}>Pesan kurir</RowAction>}
                      {awaitingResi(o) && <RowAction icon={PackageSearch} busy={checking === o.id} onClick={() => checkResi(o)}>Cek resi</RowAction>}
                      {canInputResi(o) && <RowAction icon={Truck} busy={shipping.includes(o.id)} onClick={() => inputResi(o)}>Input resi</RowAction>}
                      {canPrintWeb(o) && <RowAction tone="primary" icon={Printer} href={labelUrl([o.id])}>Cetak resi</RowAction>}
                      {canTrackWeb(o) && <RowAction icon={PackageSearch} onClick={() => setTrack(o)}>Lacak resi</RowAction>}
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
      {bookTarget && <BookCourierModal order={bookTarget} busy={shipping.includes(bookTarget.id)} onClose={() => setBookTarget(null)} onSubmit={(extra) => bookCourier([bookTarget.id], extra)} />}
      {detail && <OrderDetail order={detail} staff={staff} onClose={() => setDetail(null)} onSaved={() => { setDetail(null); load(); }} />}
      {fuQueue && <FollowupQueue onClose={() => setFuQueue(false)} onSent={load} />}
      {csReport && <CsReport from={filters.from} to={filters.to} onClose={() => setCsReport(false)} />}
      {creating && <InputOrder onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
    </div>
  );
}

const RISK = {
  high: { label: "Risiko COD tinggi", cls: "bg-rose-100 text-rose-700", box: "bg-rose-50 text-rose-800 ring-rose-200", tip: "Konfirmasi lewat WhatsApp dulu; kalau tidak dibalas, minta transfer/DP atau batalkan sebelum dikirim." },
  medium: { label: "Risiko COD sedang", cls: "bg-amber-100 text-amber-700", box: "bg-amber-50 text-amber-800 ring-amber-200", tip: "Konfirmasi pesanan & alamat lewat WhatsApp sebelum dikirim." },
  low: { label: "Risiko COD rendah", cls: "bg-emerald-100 text-emerald-700", box: "bg-emerald-50 text-emerald-800 ring-emerald-200", tip: "Aman dikirim." },
} as const;

/** COD orders not shipped yet: how likely the parcel comes back (RTS), from this store's history with the number. */
function CodRiskBadge({ risk }: { risk: CodRisk }) {
  return <span title={risk.reasons.join(" · ")} className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${RISK[risk.level].cls}`}>{RISK[risk.level].label}</span>;
}

function CodRiskCard({ risk }: { risk: CodRisk }) {
  const r = RISK[risk.level];
  return (
    <div className={`mb-5 rounded-xl p-4 text-sm ring-1 ${r.box}`}>
      <p className="flex items-center justify-between gap-2 font-semibold"><span>{r.label}</span><span className="text-xs">skor {risk.score}/100</span></p>
      {risk.reasons.length > 0 && <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">{risk.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
      <p className="mt-2 text-xs font-semibold">{r.tip}</p>
    </div>
  );
}

/** What KiriminAja booked (pickup time, COD to collect, sorting code) and "Batalkan pengiriman" before pickup. */
function KiriminAjaInfo({ o, onCancelled }: { o: Order; onCancelled: () => void }) {
  const ka = ((o.custom_fields as Record<string, unknown> | null)?.kiriminaja ?? {}) as Record<string, string | number | boolean | undefined>;
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    const msg = o.tracking_number
      ? `Batalkan pengiriman ${o.tracking_number}? Hanya bisa sebelum kurir mengambil paket. Pesanan bisa dipesankan kurir lagi.`
      : "Resi belum terbit, jadi paket ini hanya dilepas di Pesanin supaya bisa dipesankan kurir lagi. Hapus juga paketnya di dashboard KiriminAja supaya tidak dobel.";
    if (!(await askConfirm(msg, { title: "Batalkan pengiriman", confirmLabel: "Batalkan", danger: true }))) return;
    setBusy(true);
    try { await api(`/orders/${o.id}/ship/cancel`, { method: "POST", json: { reason: "Dibatalkan penjual" } }); onCancelled(); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal membatalkan", "Gagal"); } finally { setBusy(false); }
  };
  const rows = [
    ka.dropoff ? ["Penyerahan", "Drop-off ke gerai"] : ka.schedule ? ["Jadwal pickup", new Date(String(ka.schedule).replace(" ", "T") + "+07:00").toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })] : null,
    ka.pickup_number ? ["No. pickup", String(ka.pickup_number)] : null,
    ka.sorting_code ? ["Kode sortir (label)", String(ka.sorting_code)] : null,
    ka.cod ? ["COD ditagih kurir", rupiah(Number(ka.cod))] : null,
    ka.insurance ? ["Asuransi", rupiah(Number(ka.insurance))] : null,
    ka.last_event ? ["Update terakhir", String(ka.last_event).replace(/_packages$/, "").replace(/_/g, " ")] : null,
  ].filter(Boolean) as [string, string][];
  // Non-COD shipments wait until the shipping fee is paid to KiriminAja (KA Credit or the payment QR).
  const payStatus = String(ka.payment_status ?? "").toLowerCase();
  const unpaid = !!payStatus && !["paid", "0", "success", "settlement"].includes(payStatus);
  return (
    <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs">
      {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><b className="text-right text-slate-700">{v}</b></div>)}
      {unpaid && !o.tracking_number && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-amber-800">
          <b>Ongkir belum dibayar ke KiriminAja</b> (status: {String(ka.payment_status)}). Resi baru terbit setelah dibayar.
          {ka.qr_url ? <> <a href={String(ka.qr_url)} target="_blank" rel="noreferrer" className="font-semibold underline">Bayar lewat QRIS</a></> : " Bayar di dashboard KiriminAja, atau pakai saldo KA Credit (KIRIMINAJA_PAYMENT=credit)."}
        </div>
      )}
      {(o.tracking_number || o.shipping_ref) && (!o.shipping_status || o.shipping_status === "not_shipped") && (
        <button type="button" onClick={cancel} disabled={busy} className="mt-2 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50">{busy ? "Membatalkan…" : o.tracking_number ? "Batalkan pengiriman" : "Batalkan & pesan ulang kurir"}</button>
      )}
    </div>
  );
}

function OrderDetail({ order, staff, onClose, onSaved }: { order: Order; staff: CsOption[]; onClose: () => void; onSaved: () => void }) {
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

  async function setCs(patch: { cs_staff_id?: number | null; contacted?: boolean }) {
    try {
      const r = await api<Order>(`/orders/${o.id}/cs`, { method: "PUT", json: patch });
      setO({ ...o, cs_staff_id: r.cs_staff_id, cs_staff: r.cs_staff, cs_contacted_at: r.cs_contacted_at });
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal mengubah CS", "Gagal"); }
  }

  async function setCod(status: "confirmed" | "declined") {
    try {
      const r = await api<Pick<Order, "cod_confirm_status" | "cod_confirmed_at">>(`/orders/${o.id}/cod-confirm`, { method: "PUT", json: { status } });
      setO((x) => ({ ...x, ...r }));
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal menyimpan", "Gagal"); }
  }

  async function followup(event: string) {
    const r = await api<{ via: "api" | "manual"; url: string | null }>(`/orders/${o.id}/followup`, { method: "POST", json: { event } });
    if (r.url) window.open(r.url, "_blank"); else showAlert("Terkirim otomatis lewat WhatsApp bisnis (gratis, pembeli chat dalam 24 jam terakhir).", "Follow up terkirim");
    setO((x) => ({ ...x, followup_count: x.followup_count + 1, cs_contacted_at: x.cs_contacted_at ?? new Date().toISOString() }));
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
      {o.cod_risk && <CodRiskCard risk={o.cod_risk} />}
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
          {o.shipping_provider === "kiriminaja" && <KiriminAjaInfo o={o} onCancelled={() => { setO({ ...o, tracking_number: null, shipping_provider: null } as unknown as Order); onSaved(); }} />}
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
            {/* Buyer's checkout fields only: system data (KiriminAja booking, cancel history…) is objects, shown elsewhere. */}
            {o.custom_fields && Object.entries(o.custom_fields as Record<string, unknown>)
              .filter(([k, v]) => !k.startsWith("kiriminaja") && (typeof v === "string" || typeof v === "number") && String(v) !== "")
              .map(([k, v]) => <div key={k} className="text-xs"><b>{k}:</b> {String(v)}</div>)}
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
              {o.product?.type !== "digital" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status Pengiriman">
                    <Select className="input" value={o.shipping_status} onChange={(e) => set("shipping_status", e.target.value)}>
                      <option value="not_shipped">Belum Dikirim</option>
                      <option value="picked_up">Sudah Dijemput</option>
                      <option value="in_transit">Dalam Pengiriman</option>
                      <option value="delivered">Diterima</option>
                      <option value="returned">Dikembalikan</option>
                    </Select>
                  </Field>
                  <Field label="Nomor Resi">
                    <input className="input font-mono text-xs" placeholder="Masukkan no. resi" value={o.tracking_number ?? ""} onChange={(e) => set("tracking_number", e.target.value)} />
                  </Field>
                </div>
              )}
              <p className="text-xs text-slate-500">Menandai <b>Paid</b> pada pesanan Pending otomatis memindahkannya ke <b>Processing</b>. Cancelled/Refunded mengembalikan stok.</p>
              <Field label="Catatan Internal"><textarea className="textarea" rows={2} value={o.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </>
          )}
          {o.payment_method === "cod" && !o.is_abandoned && (
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="label">Konfirmasi COD</label>
              <div className="flex flex-wrap items-center gap-2">
                <CodConfirmBadge o={o} always />
                {o.cod_confirm_status !== "confirmed" && <button className="btn-outline btn-sm text-emerald-700" onClick={() => setCod("confirmed")}><CheckCircle2 size={13} />Tandai dikonfirmasi</button>}
                {o.cod_confirm_status !== "declined" && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setCod("declined")}>Pembeli batal</button>}
              </div>
              <p className="mt-1 text-xs text-slate-500">Resi otomatis untuk COD menunggu sampai dikonfirmasi (jika Konfirmasi COD otomatis aktif di Pengaturan → Otomatisasi Pesanan).</p>
            </div>
          )}
          {staff.length > 0 && !o.is_abandoned && (
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="label">CS penanggung jawab</label>
              <div className="flex flex-wrap items-center gap-3">
                <Select className="input w-48" value={o.cs_staff_id ? String(o.cs_staff_id) : ""} onChange={(e) => setCs({ cs_staff_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Belum ada CS</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" className="accent-brand-600" checked={!!o.cs_contacted_at} onChange={(e) => setCs({ contacted: e.target.checked })} />Pembeli sudah dihubungi</label>
              </div>
              <p className="mt-1 text-xs text-slate-500">Otomatis tercentang saat CS mengirim follow up WhatsApp dari sini.</p>
            </div>
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

type ShippingRateOption = { code: string; courier: string; name: string; service: string; cost: number; etd: string; cod?: boolean; drop?: boolean; cut_off?: string | null; cod_fee_pct?: number; insurance_pct?: number; force_insurance?: boolean };
type BookExtra = { courier?: string; courier_code?: string; courier_service?: string; shipping_cost?: number; pickup_method?: "pickup" | "dropoff"; insurance?: boolean; length?: number; width?: number; height?: number; schedule?: string };

const FALLBACK_COURIERS: ShippingRateOption[] = [
  { code: "jne:reg", courier: "jne", name: "JNE", service: "REG", cost: 0, etd: "-" },
  { code: "jnt:ez", courier: "jnt", name: "J&T", service: "EZ", cost: 0, etd: "-" },
  { code: "sicepat:reg", courier: "sicepat", name: "SiCepat", service: "REG", cost: 0, etd: "-" },
  { code: "anteraja:reg", courier: "anteraja", name: "Anteraja", service: "REG", cost: 0, etd: "-" },
  { code: "idexpress:std", courier: "idexpress", name: "iDexpress", service: "STD", cost: 0, etd: "-" },
  { code: "sap:reg", courier: "sap", name: "SAP", service: "REG", cost: 0, etd: "-" },
  { code: "ninja:reg", courier: "ninja", name: "Ninja", service: "REG", cost: 0, etd: "-" },
];

function BookCourierModal({ order, busy, onClose, onSubmit }: {
  order: Order; busy: boolean; onClose: () => void;
  onSubmit: (extra?: BookExtra) => void;
}) {
  type Info = { rates: ShippingRateOption[]; error?: string | null; schedules?: { clock: string; until: string | null; holiday: boolean }[]; cod?: boolean; item_value?: number; weight?: number; pickup?: { name: string | null; address: string | null; city: string | null } };
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState(order.courier_code || "");
  const [method, setMethod] = useState<"pickup" | "dropoff">("pickup");
  const [schedule, setSchedule] = useState("");
  const [insure, setInsure] = useState(false);
  const [dims, setDims] = useState({ length: 10, width: 10, height: 10 });

  const loadRates = useCallback(() => {
    setInfo(null); setErr("");
    api<Info>(`/orders/${order.id}/shipping-rates`)
      .then((r) => {
        setInfo(r);
        if (r.error) setErr(r.error);
        const first = r.schedules?.find((x) => !x.holiday);
        if (first) setSchedule(first.clock);
      })
      .catch((e) => { setInfo({ rates: [] }); setErr(e instanceof ApiError ? e.message : "Gagal memuat daftar ekspedisi."); });
  }, [order.id]);
  useEffect(() => { loadRates(); }, [loadRates]);

  const cod = info?.cod ?? order.payment_method === "cod";
  const rates = info?.rates ?? [];
  // Only services that can take this parcel: COD orders need a COD service; drop-off needs a courier that accepts it.
  const usable = (r: ShippingRateOption) => (!cod || r.cod !== false) && (method === "pickup" || r.drop !== false);
  const list = info ? (rates.length ? rates : FALLBACK_COURIERS) : [];
  const shown = list.filter(usable);
  const hidden = list.length - shown.length;
  const chosen = shown.find((r) => r.code === picked) ?? null;
  useEffect(() => { if (info && !shown.some((r) => r.code === picked) && shown[0]) setPicked(shown[0].code); }, [info, method]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same formulas KiriminAja uses (insurance rounded up to Rp100; COD fee on item + shipping + insurance).
  const itemValue = Math.max(1000, info?.item_value ?? order.subtotal);
  const insured = insure || !!chosen?.force_insurance;
  const insurance = insured && chosen?.insurance_pct ? Math.ceil((itemValue * chosen.insurance_pct) / 100 / 100) * 100 : 0;
  const ship = chosen?.cost ?? order.shipping_cost;
  const codFee = cod && chosen?.cod_fee_pct ? Math.ceil(((itemValue + ship + insurance) * chosen.cod_fee_pct) / 100) : 0;
  const codTotal = cod ? itemValue + ship + insurance + codFee : 0;

  const submit = () => onSubmit({
    ...(chosen ? { courier: chosen.name, courier_code: chosen.code, courier_service: chosen.service, ...(chosen.cost > 0 ? { shipping_cost: chosen.cost } : {}) } : {}),
    pickup_method: method, insurance: insured, ...dims, ...(method === "pickup" && schedule ? { schedule } : {}),
  });
  const time = (s: string) => new Date(s.replace(" ", "T") + "+07:00").toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Modal open onClose={onClose} title={`Pesan Kurir · ${order.code}`} icon={Truck}>
      <div className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-400">PENGIRIM</p>
            <p className="mt-0.5"><b className="text-slate-800">{info?.pickup?.name ?? "-"}</b></p>
            <p>{[info?.pickup?.address, info?.pickup?.city].filter(Boolean).join(", ") || "Atur di Pengaturan → Alamat"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-400">PENERIMA</p>
            <p className="mt-0.5"><b className="text-slate-800">{order.customer_name}</b> · {order.phone}</p>
            <p>{[order.address, order.village, order.district, order.city].filter(Boolean).join(", ")}</p>
          </div>
        </div>

        <Field label="Metode Penyerahan Paket">
          <div className="grid grid-cols-2 gap-2">
            {([["pickup", "Pickup", "Kurir jemput ke alamat"], ["dropoff", "Dropoff", "Antar ke gerai ekspedisi"]] as const).map(([k, title, desc]) => (
              <button key={k} type="button" onClick={() => setMethod(k)}
                className={`rounded-lg border p-2.5 text-left transition ${method === k ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300"}`}>
                <p className="font-semibold text-navy">{title}</p>
                <p className="text-[11px] text-slate-500">{desc}</p>
              </button>
            ))}
          </div>
        </Field>

        {method === "pickup" && !!info?.schedules?.length && (
          <Field label="Jadwal Pickup">
            <select className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              {info.schedules.filter((x) => !x.holiday).map((x) => <option key={x.clock} value={x.clock}>{time(x.clock)}{x.until ? ` – ${x.until.slice(11, 16)}` : ""}</option>)}
            </select>
          </Field>
        )}

        <Field label={`Pilih Ekspedisi & Layanan${cod ? " (yang melayani COD)" : ""}`}>
          {!info ? <p className="text-xs text-slate-500">Memuat daftar ekspedisi…</p> : (
            <div className="space-y-2">
              {err && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span>{err}</span><button type="button" onClick={loadRates} className="shrink-0 font-semibold underline">Muat ulang</button>
                </div>
              )}
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {shown.map((r) => (
                  <label key={r.code} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 transition ${picked === r.code ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex items-center gap-2.5">
                      <input type="radio" name="courier_pick" className="accent-brand-600" checked={picked === r.code} onChange={() => setPicked(r.code)} />
                      <div>
                        <p className="font-semibold text-navy">{r.name} · {r.service}</p>
                        <p className="text-xs text-slate-500">{[r.etd !== "-" ? `Estimasi ${r.etd}` : null, r.cut_off ? `cut-off ${r.cut_off}` : null, r.cod ? "COD" : null, r.drop ? "bisa drop-off" : null, r.force_insurance ? "wajib asuransi" : null].filter(Boolean).join(" · ") || "Layanan KiriminAja"}</p>
                      </div>
                    </div>
                    {r.cost > 0 && <span className="shrink-0 font-semibold text-navy">{rupiah(r.cost)}</span>}
                  </label>
                ))}
                {!shown.length && <p className="text-xs text-rose-600">Tidak ada layanan yang {cod ? "melayani COD" : "tersedia"}{method === "dropoff" ? " dengan drop-off" : ""} ke alamat ini.</p>}
              </div>
              {hidden > 0 && <p className="text-[11px] text-slate-400">{hidden} layanan disembunyikan karena tidak mendukung {cod ? "COD" : ""}{cod && method === "dropoff" ? "/" : ""}{method === "dropoff" ? "drop-off" : ""}.</p>}
            </div>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ukuran paket (cm)">
            <div className="flex items-center gap-1.5">
              {(["length", "width", "height"] as const).map((k, i) => (
                <span key={k} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-400">×</span>}
                  <input type="number" min={1} max={300} className="input h-9 w-16 text-center" value={dims[k]} onChange={(e) => setDims({ ...dims, [k]: Math.max(1, Number(e.target.value) || 1) })} title={k === "length" ? "Panjang" : k === "width" ? "Lebar" : "Tinggi"} />
                </span>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Berat {((info?.weight ?? order.weight ?? 0) / 1000).toLocaleString("id-ID")} kg. Ukuran besar bisa kena berat volume.</p>
          </Field>
          <Field label="Asuransi">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" className="accent-brand-600" checked={insured} disabled={!!chosen?.force_insurance} onChange={(e) => setInsure(e.target.checked)} />
              Asuransikan paket{chosen?.insurance_pct ? ` (${chosen.insurance_pct}% nilai barang)` : ""}{chosen?.force_insurance ? " · wajib untuk layanan ini" : ""}
            </label>
            {insured && insurance > 0 && <p className="mt-1 text-[11px] text-slate-500">Biaya asuransi ±{rupiah(insurance)}</p>}
          </Field>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs">
          <div className="flex justify-between"><span className="text-slate-500">Ongkir KiriminAja</span><b>{rupiah(ship)}</b></div>
          {insurance > 0 && <div className="flex justify-between"><span className="text-slate-500">Asuransi</span><b>{rupiah(insurance)}</b></div>}
          {cod && (
            <>
              <div className="flex justify-between"><span className="text-slate-500">Biaya COD{chosen?.cod_fee_pct ? ` (${chosen.cod_fee_pct}%)` : ""}</span><b>{rupiah(codFee)}</b></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold text-slate-700">Ditagih kurir ke pembeli (COD)</span><b className="text-navy">{rupiah(codTotal)}</b></div>
              {Math.abs(codTotal - order.total) > 100 && <p className="mt-1 text-[11px] text-amber-700">Beda dengan total pesanan {rupiah(order.total)}: KiriminAja menagih sesuai rumus ongkir + asuransi + biaya COD mereka.</p>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={onClose} className="btn-outline">Batal</button>
          <button type="button" disabled={busy || (!chosen && !order.courier)} onClick={submit} className="btn-primary">
            {busy ? "Memproses…" : `Pesan Kurir (${method === "dropoff" ? "Dropoff" : "Pickup"})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Page() {
  return <Suspense><Orders /></Suspense>;
}

/** Kinerja CS: orders handled per CS in the chosen period, how many were contacted and paid (closing rate). */
function CsReport({ from, to, onClose }: { from: string; to: string; onClose: () => void }) {
  type Row = { id: number | null; name: string; orders: number; paid: number; contacted: number; revenue: number; closing_rate: number };
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    api<{ rows: Row[] }>(`/orders/cs-summary?${new URLSearchParams({ from, to })}`).then((r) => setRows(r.rows)).catch(() => setRows([]));
  }, [from, to]);
  return (
    <Modal open onClose={onClose} title="Kinerja CS" wide>
      <p className="mb-3 text-xs text-slate-500">Pesanan web yang dibagikan ke tiap CS pada periode filter tanggal. Closing rate = pesanan lunas ÷ pesanan yang dipegang.</p>
      {!rows ? <p className="py-8 text-center text-sm text-slate-400">Memuat…</p> : !rows.length ? <p className="py-8 text-center text-sm text-slate-500">Belum ada pesanan di periode ini.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100">
              <th className="py-2 pr-3">CS</th><th className="px-3 text-right">Pesanan</th><th className="px-3 text-right">Dihubungi</th><th className="px-3 text-right">Lunas</th><th className="px-3 text-right">Closing</th><th className="pl-3 text-right">Omzet lunas</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id ?? "none"} className={r.id ? "" : "text-slate-500"}>
                  <td className="py-2.5 pr-3 font-medium text-navy">{r.name}</td>
                  <td className="px-3 text-right">{r.orders}</td>
                  <td className="px-3 text-right">{r.id ? <>{r.contacted}<span className="text-xs text-slate-400"> ({r.orders ? Math.round((r.contacted / r.orders) * 100) : 0}%)</span></> : "-"}</td>
                  <td className="px-3 text-right">{r.paid}</td>
                  <td className="px-3 text-right font-semibold">{r.closing_rate}%</td>
                  <td className="pl-3 text-right">{rupiah(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
