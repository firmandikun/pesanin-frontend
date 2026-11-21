"use client";
import { ArrowLeft, ClipboardList, Hash, Loader2, MapPin, Megaphone, PackageX, Receipt, RotateCcw, Truck, User, Wallet } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { PageHead } from "@/components/kit";
import { CancelStockDialog, ReturnDialog, SellerNote } from "@/components/marketplace/AfterSales";
import { cleanCourier } from "@/lib/courier";
import { askConfirm } from "@/components/Dialogs";
import { api, ApiError, rupiah, type Order } from "@/lib/api";

type Detail = {
  order: Order & { fee_breakdown?: { key: string; label: string; amount: number }[] | null; escrow_final?: boolean; completed_at?: string | null; custom_fields?: Record<string, string> | null };
  history: { title: string; desc: string | null; at: string }[];
  cogs: { lines: { name: string; variant: string | null; qty: number; hpp: number | null; total: number | null }[]; missing: number; total: number | null; partial: number };
  profit: number | null;
  cancelled: boolean;
  ads: { date: string; per_conversion: number; net_after_ads: number | null; lines: { item_id: number; name: string; campaign: string; expense: number; conversions: number; per_conversion: number | null }[] } | null;
  return: { id: number; return_sn: string; status: string; refund_amount: number; reason: string | null; text_reason: string | null; due_at: string | null; requested_at: string | null; tracking_number: string | null } | null;
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
const RETURN_STATUS: Record<string, string> = {
  REQUESTED: "Pengajuan Baru", PROCESSING: "Menunggu Validasi Penjual", ACCEPTED: "Dana Dikembalikan ke Pembeli", JUDGING: "Sedang Ditinjau Shopee",
  SELLER_DISPUTE: "Banding Diajukan", CANCELLED: "Dibatalkan Pembeli", CLOSED: "Selesai",
};
const REASON: Record<string, string> = {
  NOT_RECEIPT: "Belum menerima pesanan", WRONG_ITEM: "Barang yang dikirim salah", ITEM_DAMAGED: "Barang rusak", DIFFERENT_DESCRIPTION: "Barang tidak sesuai deskripsi",
  MUTUAL_AGREE: "Kesepakatan bersama", OTHER: "Lainnya", ITEM_WRONGDAMAGED: "Barang salah/rusak", CHANGE_MIND: "Berubah pikiran", ITEM_MISSING: "Barang kurang",
  EXPECTATION_FAILED: "Tidak sesuai harapan", ITEM_FAKE: "Barang palsu", PHYSICAL_DMG: "Kerusakan fisik", FUNCTIONAL_DMG: "Tidak berfungsi", SLIGHT_SCRATCH_DENTS: "Lecet / penyok ringan",
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
  const [busy, setBusy] = useState("");

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
  const cancelled = d.cancelled;
  const fees = cancelled ? [] : o.fee_breakdown ?? [];
  // Cancelled: no income at all (Shopee's earlier estimate no longer applies).
  const income = cancelled ? 0 : o.escrow_amount;
  const demo = !!o.marketplace_shop?.is_demo;
  const canCancel = !demo && ["UNPAID", "READY_TO_SHIP", "PROCESSED"].includes(o.external_status ?? "") && items.length > 0;
  const events = track?.events ?? [];
  const buyer = o.custom_fields?.buyer_username;
  const cancelReason = o.custom_fields?.cancel_reason;
  const rt = d.return;
  const retOpen = rt && (rt.status === "REQUESTED" || rt.status === "PROCESSING");
  // Buyer asked to cancel: answer here, like Seller Centre (Setuju = cancel & refund, Tolak = keep the order).
  const answerCancel = async (operation: "ACCEPT" | "REJECT") => {
    const ok = await askConfirm(operation === "ACCEPT"
      ? `Setujui pembatalan pesanan ${o.external_order_sn}? Pesanan dibatalkan dan dana dikembalikan ke pembeli.`
      : `Tolak pembatalan pesanan ${o.external_order_sn}? Pesanan tetap diproses dan wajib dikirim.`,
    { title: operation === "ACCEPT" ? "Setujui Pembatalan" : "Tolak Pembatalan", confirmLabel: operation === "ACCEPT" ? "Setuju" : "Tolak", danger: operation === "ACCEPT" });
    if (!ok) return;
    setBusy(operation);
    try { const r = await api<{ message: string }>("/labels/shopee/cancel", { method: "POST", json: { order_id: o.id, operation } }); setNotice(r.message); load(); }
    catch (e) { setNotice(e instanceof ApiError ? e.message : "Gagal memproses pembatalan di Shopee."); } finally { setBusy(""); }
  };

  return (
    <div className="space-y-4">
      <Back />
      {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <Title icon={ClipboardList}>{status}</Title>
            <div className="space-y-3 pl-[30px] text-sm text-slate-500">
              {o.external_status === "IN_CANCEL" ? (
                <>
                  <p>Pembeli mengajukan pembatalan{cancelReason ? <> dengan alasan <b className="text-slate-700">&quot;{cancelReason}&quot;</b></> : ""}. Silakan respons sebelum batas waktu dari Shopee. Jika tidak, pesanan akan dibatalkan secara otomatis oleh sistem.</p>
                  {!demo && (
                    <div className="flex justify-end gap-2 rounded-lg bg-slate-50 p-4">
                      <button onClick={() => answerCancel("ACCEPT")} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#ee4d2d] px-5 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-50">{busy === "ACCEPT" && <Loader2 size={14} className="animate-spin" />}Setuju</button>
                      <button onClick={() => answerCancel("REJECT")} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#ee4d2d] px-5 text-sm font-semibold text-white hover:bg-[#d73f22] disabled:opacity-50">{busy === "REJECT" && <Loader2 size={14} className="animate-spin" />}Tolak</button>
                    </div>
                  )}
                </>
              ) : (
                <p>{desc}{o.external_status === "CANCELLED" && cancelReason ? ` Alasan: ${cancelReason}.` : ""}{o.external_status === "CANCELLED" && o.external_note ? ` ${o.external_note}` : ""}</p>
              )}
              {rt && (
                <div className={`rounded-lg p-4 ${retOpen ? "bg-rose-50" : "bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <RotateCcw size={15} className="text-[#ee4d2d]" />
                    <b className="text-slate-800">Pengembalian Barang/Dana</b>
                    <span className={`text-xs font-semibold ${retOpen ? "text-rose-600" : "text-slate-500"}`}>{RETURN_STATUS[rt.status] ?? rt.status}</span>
                    <span className="ml-auto font-semibold text-slate-800">{rupiah(rt.refund_amount)}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{REASON[rt.reason ?? ""] ?? rt.reason ?? "-"}{rt.text_reason ? ` · "${rt.text_reason}"` : ""}</p>
                  <p className="mt-0.5 text-xs text-slate-400">No. Pengajuan {rt.return_sn}{rt.requested_at ? ` · diajukan ${when(rt.requested_at)}` : ""}{retOpen && rt.due_at ? ` · tanggapi sebelum ${when(rt.due_at)}` : ""}{rt.tracking_number ? ` · resi retur ${rt.tracking_number}` : ""}</p>
                  {!demo && <div className="mt-3 flex justify-end"><button onClick={() => setRet(true)} className={`inline-flex h-9 items-center rounded-md px-5 text-sm font-semibold ${retOpen ? "bg-[#ee4d2d] text-white hover:bg-[#d73f22]" : "border border-slate-200 bg-white text-slate-700"}`}>{retOpen ? "Tanggapi" : "Lihat Rincian"}</button></div>}
                </div>
              )}
            </div>
          </Card>

          <Card className="space-y-6">
            <div>
              <Title icon={Hash}>No. Pesanan</Title>
              <p className="pl-[30px] font-mono text-sm text-slate-700">{o.external_order_sn}</p>
              <p className="flex items-center gap-1 pl-[30px] text-xs text-slate-400"><ShopeeMark size={11} />{o.marketplace_shop?.shop_name} · dibuat {when(o.created_at)}</p>
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
                {cancelled ? <p className="text-right text-xs text-slate-500">Pesanan dibatalkan, tidak ada penghasilan maupun biaya Shopee.</p>
                  : !fees.length && <p className="text-right text-xs text-slate-400">Rincian biaya Shopee muncul setelah pesanan diproses.</p>}
                <div className="grid grid-cols-[1fr_150px] items-center gap-4 border-t border-slate-100 pt-3"><dt className="text-right font-medium text-slate-700">Total Penghasilan{o.escrow_final || cancelled ? "" : " (estimasi)"}</dt>
                  <dd className="text-right text-2xl font-semibold text-[#ee4d2d]">{income !== null ? rupiah(income) : "-"}</dd></div>
              </dl>
              {!cancelled && <div className="border-t border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-sm">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Wallet size={13} className="text-[#ee4d2d]" />Laba bersih pesanan</p>
                <dl className="space-y-2">
                  <div className="grid grid-cols-[1fr_150px] gap-4"><dt className="text-right text-slate-600">Total Penghasilan dari Shopee</dt><dd className="text-right text-slate-800">{income !== null ? rupiah(income) : "-"}</dd></div>
                  {d.cogs.lines.map((l, k) => (
                    <div key={k} className="grid grid-cols-[1fr_150px] gap-4">
                      <dt className="text-right text-slate-600">HPP{d.cogs.lines.length > 1 ? ` · ${l.name}` : ""}<span className="block text-[11px] text-slate-400">{l.hpp ? `${rupiah(l.hpp)} × ${l.qty}` : "HPP belum diisi"}{l.variant ? ` · ${l.variant}` : ""}</span></dt>
                      <dd className="text-right text-slate-700">{l.total !== null ? `-${rupiah(l.total)}` : <span className="text-xs text-amber-600">belum diisi</span>}</dd>
                    </div>
                  ))}
                  {d.ads?.lines.map((l) => (
                    <div key={l.item_id} className="grid grid-cols-[1fr_150px] gap-4">
                      <dt className="text-right text-slate-600">Biaya per konversi iklan{d.ads!.lines.length > 1 ? ` · ${l.name}` : ""}
                        <span className="block text-[11px] text-slate-400"><Megaphone size={10} className="mr-1 inline text-[#ee4d2d]" />{l.campaign} · {rupiah(l.expense)} ÷ {l.conversions} konversi ({d.ads!.date.slice(8)}/{d.ads!.date.slice(5, 7)})</span></dt>
                      <dd className="text-right text-slate-700">{l.per_conversion === null ? <span className="text-xs text-amber-600">belum ada konversi</span> : `-${rupiah(l.per_conversion)}`}</dd>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_150px] items-center gap-4 border-t border-slate-200 pt-2"><dt className="text-right font-semibold text-slate-800">Laba bersih</dt>
                    <dd className={`text-right text-xl font-bold ${d.profit === null ? "text-slate-400" : d.profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>{d.profit === null ? "-" : d.profit < 0 ? `-${rupiah(-d.profit)}` : rupiah(d.profit)}</dd></div>
                </dl>
                {d.cogs.missing > 0 && <p className="mt-2 text-right text-[11px] text-amber-700">{d.cogs.missing} produk belum punya HPP. Isi di Semua Produk → Input HPP Massal agar laba bersih bisa dihitung.</p>}
                {d.ads && <p className="mt-1 text-right text-[11px] text-slate-400">Biaya per konversi sama dengan di halaman Iklan Shopee dan laporan laba.</p>}
              </div>}
            </div>
          </Card>

          <Card className="flex items-center gap-3"><Wallet size={18} className="text-[#ee4d2d]" /><span className="flex-1 text-[15px] font-semibold text-slate-800">Penghasilan Akhir</span>
            <span className="text-2xl font-semibold text-[#ee4d2d]">{income !== null ? rupiah(income) : "-"}</span></Card>
          <Card className="flex items-center gap-3"><User size={18} className="text-[#ee4d2d]" /><span className="flex-1 text-[15px] font-semibold text-slate-800">Pembayaran Pembeli<span className="block text-xs font-normal text-slate-400">{o.payment_channel || ""}{o.paid_at ? ` · dibayar ${when(o.paid_at)}` : ""}</span></span>
            <span className="text-lg font-semibold text-slate-800">{rupiah(o.total)}</span></Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20">
          {!demo && <Card><SellerNote order={o} onSaved={(note) => setD({ ...d, order: { ...o, seller_note: note } })} /></Card>}
          {canCancel && (
            <Card className="space-y-2">
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
