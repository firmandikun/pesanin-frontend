"use client";
import { CheckCircle2, Loader2, PackageCheck, Search, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { askConfirm, askText, showAlert } from "@/components/Dialogs";
import { Panel } from "@/components/kit";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";

type Row = {
  id: number; code: string; created_at: string; paid_at: string | null; customer_name: string; phone: string; address: string | null;
  village: string | null; district: string | null; city: string | null; province: string | null; postal_code: string | null;
  variant: string | null; quantity: number; total: number; dropship_cost: number; payment_method: string; payment_status: string;
  payment_via: string | null; status: string; shipping_status: string; courier: string | null; courier_service: string | null; tracking_number: string | null;
  modal_status: "lunas" | "ditahan_pesanin" | "belum"; dropship_paid_at: string | null;
  user: { id: number; store_name: string; whatsapp: string | null } | null; product: { id: number; name: string } | null;
  dropship_product: { id: number; name: string; sku: string; warehouse_city: string | null } | null;
};
type Data = { orders: Paginated<Row>; counts: Record<string, number> };

const TABS: [string, string][] = [["perlu_kirim", "Perlu dikirim"], ["menunggu_bayar", "Menunggu bayar"], ["dikirim", "Sudah dikirim"], ["batal", "Batal"], ["semua", "Semua"]];
const MODAL: Record<Row["modal_status"], [string, string]> = {
  lunas: ["Modal lunas", "bg-emerald-50 text-emerald-700"],
  ditahan_pesanin: ["Dana di Pesanin", "bg-sky-50 text-sky-700"],
  belum: ["Modal belum dibayar", "bg-amber-50 text-amber-700"],
};
const date = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");

/** Admin → Pesanan Dropship: the warehouse queue of orders placed on dropshippers' pages. */
export default function DropshipOrders() {
  const [tab, setTab] = useState("perlu_kirim");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    api<Data>(`/admin/dropship/orders?${new URLSearchParams({ tab, search, page: String(page) })}`).then(setD)
      .catch((e) => showAlert(e instanceof ApiError ? e.message : "Gagal memuat pesanan dropship.", "Gagal"));
  }, [tab, search, page]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const ship = async (o: Row) => {
    if (o.modal_status === "belum" && !(await askConfirm(`Modal ${rupiah(o.dropship_cost)} dari ${o.user?.store_name} belum diterima. Tetap kirim?`, { title: "Modal belum dibayar", confirmLabel: "Tetap kirim" }))) return;
    const resi = (await askText(`Nomor resi ${o.code}`, "", `Kurir pilihan pembeli: ${o.courier ?? "-"} ${o.courier_service ?? ""}`))?.trim();
    if (!resi) return;
    setBusy(o.id);
    try { await api(`/admin/dropship/orders/${o.id}/ship`, { method: "POST", json: { tracking_number: resi } }); load(); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal menyimpan resi.", "Gagal"); } finally { setBusy(null); }
  };
  const modalPaid = async (o: Row, paid: boolean) => {
    setBusy(o.id);
    try { await api(`/admin/dropship/orders/${o.id}/modal-paid`, { method: "POST", json: { paid } }); load(); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal.", "Gagal"); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pesanan Dropship</h1>
        <p className="text-sm text-slate-500">Pesanan dari halaman dropshipper. Kirim dari gudang atas nama toko dropshipper, lalu isi resinya; dropshipper otomatis diberi tahu dan resinya dilacak.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setPage(1); }} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {label}{d?.counts[k] !== undefined && <span className="ml-1.5 opacity-70">{d.counts[k]}</span>}
          </button>
        ))}
        <label className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input h-9 w-64 pl-9 text-sm" placeholder="Kode, pembeli, resi" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </label>
      </div>

      <Panel className="divide-y divide-slate-100">
        {!d && <p className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />Memuat…</p>}
        {d && !d.orders.data.length && <p className="py-14 text-center text-sm text-slate-500">Tidak ada pesanan di tab ini.</p>}
        {d?.orders.data.map((o) => (
          <div key={o.id} className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1.4fr_1fr_auto]">
            <div className="min-w-0 text-sm">
              <p className="font-mono text-xs text-slate-500">{o.code} · {date(o.paid_at ?? o.created_at)}</p>
              <p className="mt-0.5 font-semibold text-slate-900">{o.dropship_product?.name ?? o.product?.name}</p>
              <p className="text-xs text-slate-500">{o.dropship_product?.sku}{o.variant ? ` · ${o.variant}` : ""} · <b>{o.quantity} pcs</b></p>
              <p className="mt-1 text-xs text-slate-500">Toko: <b className="text-slate-700">{o.user?.store_name}</b>{o.user?.whatsapp ? ` · ${o.user.whatsapp}` : ""}</p>
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-800">{o.customer_name} · {o.phone}</p>
              <p className="text-xs leading-relaxed text-slate-600">{[o.address, o.village, o.district, o.city, o.province, o.postal_code].filter(Boolean).join(", ")}</p>
              <p className="mt-1 text-xs text-slate-500">Kurir: <b>{o.courier ?? "-"} {o.courier_service ?? ""}</b>{o.tracking_number ? <> · resi <b className="font-mono">{o.tracking_number}</b></> : null}</p>
            </div>
            <div className="text-xs">
              <p className="text-slate-500">Dibayar pembeli <b className="text-slate-800">{rupiah(o.total)}</b> ({o.payment_method === "epayment" ? `E-Payment${o.payment_via === "platform" ? " · Midtrans Pesanin" : ""}` : "Transfer bank"})</p>
              <p className="mt-0.5 text-slate-500">Modal (grosir) <b className="text-slate-800">{rupiah(o.dropship_cost)}</b></p>
              <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 font-semibold ${MODAL[o.modal_status][1]}`}>{MODAL[o.modal_status][0]}</span>
              {o.payment_status !== "paid" && <p className="mt-1 font-semibold text-amber-600">Pembeli belum bayar</p>}
            </div>
            <div className="flex flex-col items-stretch gap-2 lg:w-40">
              {o.payment_status === "paid" && o.shipping_status === "not_shipped" && !["cancelled", "refunded"].includes(o.status) && (
                <button disabled={busy === o.id} onClick={() => ship(o)} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white disabled:opacity-60">
                  {busy === o.id ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}Kirim & isi resi
                </button>
              )}
              {o.shipping_status !== "not_shipped" && <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700"><PackageCheck size={14} />Sudah dikirim</span>}
              {o.modal_status === "belum" && <button disabled={busy === o.id} onClick={() => modalPaid(o, true)} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-60"><CheckCircle2 size={14} />Modal diterima</button>}
              {o.modal_status === "lunas" && <button disabled={busy === o.id} onClick={() => modalPaid(o, false)} className="text-[11px] text-slate-400 hover:text-rose-600">Batalkan tanda lunas</button>}
            </div>
          </div>
        ))}
      </Panel>
      {d && d.orders.last_page > 1 && (
        <div className="flex justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Sebelumnya</button>
          <span className="px-2 py-1.5 text-slate-500">{d.orders.current_page} / {d.orders.last_page}</span>
          <button disabled={page >= d.orders.last_page} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Berikutnya</button>
        </div>
      )}
    </div>
  );
}
