"use client";
import { ArrowLeft, ClipboardList, Hash, Loader2, MapPin, MessageSquare, PackageX, Receipt, RotateCcw, Truck, User, Wallet } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead } from "@/components/kit";
import { CancelStockDialog, ReturnDialog, SellerNote } from "@/components/marketplace/AfterSales";
import { cleanCourier } from "@/lib/courier";
import { api, ApiError, rupiah, type Order } from "@/lib/api";

type Detail = {
  order: Order & { fee_breakdown?: { key: string; label: string; amount: number }[] | null; escrow_final?: boolean; completed_at?: string | null; custom_fields?: Record<string, string> | null };
  history: { title: string; desc: string | null; at: string }[];
  return: { id: number; return_sn: string; status: string; refund_amount: number } | null;
};
type Track = { events: { time: string | null; text: string; location: string | null }[]; status: string | null };
type Item = NonNullable<Order["items"]>[number] & { image?: string | null };

const STATUS: Record<string, [string, string]> = {
  UNPAID: ["Belum Bayar", "Menunggu pembayaran dari pembeli."], PENDING: ["Menunggu", "Pesanan sedang ditinjau Shopee."],
  READY_TO_SHIP: ["Perlu Dikirim", "Atur pengiriman sebelum batas waktu."], PROCESSED: ["Perlu Dikirim", "Menunggu paket diserahkan ke jasa kirim."],
  RETRY_SHIP: ["Kirim Ulang", "Penjemputan gagal, kurir akan datang lagi."], IN_CANCEL: ["Pembatalan Diajukan", "Pembeli mengajukan pembatalan."],
  SHIPPED: ["Sudah Kirim", "Pesanan sedang dikirim ke pembeli."], TO_CONFIRM_RECEIVE: ["Sudah Kirim", "Pesanan sampai, menunggu konfirmasi pembeli."],
  TO_RETURN: ["Pengembalian", "Pembeli mengajukan pengembalian."], COMPLETED: ["Selesai", "Pesanan selesai."], CANCELLED: ["Batal", "Pesanan dibatalkan."],
};
const when = (s?: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</div>;
const Title = ({ icon: Icon, children, right }: { icon: typeof Hash; children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="mb-2 flex items-center gap-3"><Icon size={18} className="text-[#ee4d2d]" /><h2 className="flex-1 text-[15px] font-semibold text-slate-800">{children}</h2>{right}</div>
);

/** Rincian Pesanan Shopee, laid out like Seller Centre: status, shipping, buyer, money; notes and history on the side. */
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [track, setTrack] = useState<Track | null>(null);
  const [allTrack, setAllTrack] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [ret, setRet] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    api<Detail>(`/marketplace/orders/${id}`).then((x) => {
      setD(x);
      if (x.order.tracking_number) api<Track>(`/orders/${id}/tracking`).then(setTrack).catch(() => setTrack(null));
    }).catch((e) => setErr(e instanceof ApiError ? e.message : "Pesanan tidak ditemukan"));
  }, [id]);
  useEffect(load, [load]);

  if (err) return <div className="space-y-4"><Back /><p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{err}</p></div>;
  if (!d) return <p className="flex items-center gap-2 p-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat rincian pesanan…</p>;

  const o = d.order;
  const [status, desc] = STATUS[o.external_status ?? ""] ?? [o.external_status ?? "-", ""];
  const items = (o.items ?? []) as Item[];
  const fees = o.fee_breakdown ?? [];
  const demo = !!o.marketplace_shop?.is_demo;
  const canCancel = !demo && ["UNPAID", "READY_TO_SHIP", "PROCESSED"].includes(o.external_status ?? "") && items.length > 0;
  const events = track?.events ?? [];
  const buyer = o.custom_fields?.buyer_username;

  return (
    <div className="space-y-4">
      <Back />
      {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <Title icon={ClipboardList}>{status}</Title>
            <p className="pl-[30px] text-sm text-slate-500">{desc}{o.external_status === "CANCELLED" && o.external_note ? ` ${o.external_note}` : ""}</p>
          </Card>

          <Card className="space-y-6">
            <div>
              <Title icon={Hash}>No. Pesanan</Title>
              <p className="pl-[30px] font-mono text-sm text-slate-700">{o.external_order_sn}</p>
              <p className="pl-[30px] text-xs text-slate-400"><ShopeeMark size={11} /> {o.marketplace_shop?.shop_name} · dibuat {when(o.created_at)}</p>
            </div>
            <div>
              <Title icon={MapPin}>Alamat Pengiriman</Title>
              <div className="pl-[30px] text-sm text-slate-700">
                <p>{o.customer_name}{o.phone ? `, ${o.phone}` : ""}</p>
                <p className="text-slate-600">{o.address || "-"}</p>
              </div>
            </div>
            <div>
              <Title icon={Truck}>Informasi Jasa Kirim</Title>
              <div className="space-y-3 pl-[30px] text-sm">
                <p className="flex flex-wrap items-center gap-2 text-slate-700"><b>Paket 1:</b> {o.courier_service || cleanCourier(o.courier)}{o.courier_service && <span className="text-slate-400">| {cleanCourier(o.courier)}</span>}
                  {o.tracking_number ? <span className="rounded bg-emerald-500 px-1.5 py-0.5 font-mono text-xs font-semibold text-white"># {o.tracking_number}</span> : <span className="text-xs text-slate-400">resi belum terbit</span>}</p>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                  <div className="flex -space-x-2">{items.slice(0, 3).map((i, k) => i.image ? <img key={k} src={i.image} alt="" className="h-11 w-11 rounded border border-white object-cover" /> : <span key={k} className="h-11 w-11 rounded border border-white bg-slate-100" />)}</div>
                  <span className="text-slate-600">Total {items.reduce((n, i) => n + (i.qty ?? 1), 0)} produk</span>
                </div>
                {events.length > 0 && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    {(allTrack ? events : events.slice(0, 1)).map((e, k) => (
                      <div key={k} className="relative flex gap-3 pb-3 last:pb-0">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${k === 0 ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"}`} />
                        <div className="min-w-0 flex-1"><p className={k === 0 ? "font-medium text-emerald-600" : "text-slate-600"}>{e.text}{e.location ? ` · ${e.location}` : ""}</p><p className="text-xs text-slate-400">{when(e.time)}</p></div>
                        {k === 0 && events.length > 1 && <button onClick={() => setAllTrack(!allTrack)} className="h-fit text-xs text-slate-500 hover:text-[#ee4d2d]">{allTrack ? "Tutup" : "Buka"}</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><User size={20} /></span>
            <span className="flex-1 font-medium text-slate-700">{buyer || o.customer_name}</span>
            <Link href="/chat" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ee4d2d] px-4 text-sm font-semibold text-[#ee4d2d] hover:bg-orange-50"><MessageSquare size={15} />Chat Sekarang</Link>
          </Card>

          <Card>
            <Title icon={Receipt}>Informasi Pembayaran</Title>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2.5 font-medium">No.</th><th className="px-2 py-2.5 font-medium">Produk</th><th className="px-2 py-2.5 text-right font-medium">Harga Satuan</th><th className="px-2 py-2.5 text-right font-medium">Jumlah</th><th className="px-4 py-2.5 text-right font-medium">Subtotal</th></tr></thead>
                <tbody>
                  {items.map((i, k) => (
                    <tr key={k} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 text-slate-500">{k + 1}</td>
                      <td className="px-2 py-3"><div className="flex gap-3">{i.image ? <img src={i.image} alt="" className="h-12 w-12 rounded border border-slate-100 object-cover" /> : <span className="h-12 w-12 rounded bg-slate-100" />}
                        <div className="min-w-0"><p className="line-clamp-2 text-slate-800">{i.name}</p>{i.variant && <p className="text-xs text-slate-500">Variasi: {i.variant}</p>}{i.sku && <p className="text-xs text-slate-400">Kode Variasi: {i.sku}</p>}</div></div></td>
                      <td className="px-2 py-3 text-right text-slate-700">{rupiah(i.price)}</td>
                      <td className="px-2 py-3 text-right text-slate-700">{i.qty}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{rupiah(i.price * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="space-y-2 border-t border-slate-200 px-4 py-4 text-sm">
                {([["Subtotal Pesanan", o.subtotal], ...fees.map((f) => [f.label, f.amount] as [string, number])] as [string, number][]).map(([l, v]) => (
                  <div key={l} className="grid grid-cols-[1fr_150px] gap-4"><dt className="text-right text-slate-600">{l}</dt><dd className={`text-right ${v < 0 ? "text-slate-700" : "text-slate-800"}`}>{v < 0 ? `-${rupiah(-v)}` : rupiah(v)}</dd></div>
                ))}
                {!fees.length && <p className="text-right text-xs text-slate-400">Rincian biaya Shopee muncul setelah pesanan diproses.</p>}
                <div className="grid grid-cols-[1fr_150px] items-center gap-4 border-t border-slate-100 pt-3"><dt className="text-right font-medium text-slate-700">Total Penghasilan{o.escrow_final ? "" : " (estimasi)"}</dt>
                  <dd className="text-right text-2xl font-semibold text-[#ee4d2d]">{o.escrow_amount !== null ? rupiah(o.escrow_amount) : "-"}</dd></div>
              </dl>
            </div>
          </Card>

          <Card className="flex items-center gap-3"><Wallet size={18} className="text-[#ee4d2d]" /><span className="flex-1 text-[15px] font-semibold text-slate-800">Penghasilan Akhir</span>
            <span className="text-2xl font-semibold text-[#ee4d2d]">{o.escrow_amount !== null ? rupiah(o.escrow_amount) : "-"}</span></Card>
          <Card className="flex items-center gap-3"><User size={18} className="text-[#ee4d2d]" /><span className="flex-1 text-[15px] font-semibold text-slate-800">Pembayaran Pembeli<span className="block text-xs font-normal text-slate-400">{o.payment_channel || ""}{o.paid_at ? ` · dibayar ${when(o.paid_at)}` : ""}</span></span>
            <span className="text-lg font-semibold text-slate-800">{rupiah(o.total)}</span></Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20">
          {!demo && <Card><SellerNote order={o} onSaved={(note) => setD({ ...d, order: { ...o, seller_note: note } })} /></Card>}
          {(canCancel || d.return) && (
            <Card className="space-y-2">
              {d.return && <button onClick={() => setRet(true)} className="flex w-full items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><RotateCcw size={15} />Pengembalian {d.return.return_sn}<span className="ml-auto text-xs font-normal">{rupiah(d.return.refund_amount)}</span></button>}
              {canCancel && <button onClick={() => setCancel(true)} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><PackageX size={15} />Batalkan pesanan (stok habis)</button>}
            </Card>
          )}
          <div className="px-1">
            <p className="mb-4 text-center text-xs font-medium tracking-wider text-slate-400">RIWAYAT PESANAN</p>
            {d.history.map((h, k) => (
              <div key={k} className="relative flex gap-3 pb-6 last:pb-0">
                {k < d.history.length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-slate-200" />}
                <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${k === 0 ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`} />
                <div><p className={`text-sm font-medium ${k === 0 ? "text-emerald-600" : "text-slate-700"}`}>{h.title}</p>{h.desc && <p className="text-xs text-slate-500">{h.desc}</p>}<p className="text-xs text-slate-400">{when(h.at)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {cancel && <CancelStockDialog order={o} onClose={() => setCancel(false)} onDone={(_, m) => { setCancel(false); setNotice(m); load(); }} />}
      {ret && d.return && <ReturnDialog id={d.return.id} onClose={() => setRet(false)} onDone={(m) => { setRet(false); setNotice(m); load(); }} />}
    </div>
  );
}

function Back() {
  return (
    <PageHead title="Rincian Pesanan" tutorial={false} crumbs={[["Marketplace"], ["Pesanan & Pengiriman", "/marketplace/orders"], ["Rincian Pesanan"]]}>
      <Link href="/marketplace/orders" className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={15} />Kembali</Link>
    </PageHead>
  );
}
