"use client";
import { CheckCircle2, ImagePlus, Loader2, PackageX, RotateCcw, Scale, StickyNote, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { askConfirm, askText, showAlert } from "@/components/Dialogs";
import { Dialog } from "@/components/kit";
import { api, ApiError, rupiah, type Order } from "@/lib/api";

type Ret = { id: number; return_sn: string; order_sn: string | null; status: string; reason: string | null; text_reason: string | null; refund_amount: number; buyer_username: string | null; tracking_number: string | null; due_at: string | null };
type Detail = {
  return: Ret; error?: string | null; images: string[]; videos: string[]; needs_logistics: boolean;
  negotiation: { status: string | null; solution: string | null; offer_amount: number | null; offer_by: string | null; counter_limit: number | null; max_refund: number | null } | null;
  solutions: { solution: string; max_refund: number }[]; dispute_reasons: { id: number; text: string }[]; dispute_error?: string | null;
};

const SOLUTION: Record<string, string> = { RETURN_REFUND: "Kembalikan barang & dana", REFUND: "Kembalikan dana saja (tanpa retur barang)", return_refund: "Kembalikan barang & dana", refund: "Kembalikan dana saja (tanpa retur barang)" };
const errMsg = (e: unknown, d: string) => (e instanceof ApiError ? Object.values(e.errors ?? {}).flat()[0] ?? e.message : d);

/** Answer a Shopee return / refund request: accept, offer a partial refund, accept the buyer's offer, or dispute. */
export function ReturnDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: (msg: string) => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"" | "offer" | "dispute">("");
  const [busy, setBusy] = useState("");
  const [offer, setOffer] = useState({ solution: "", amount: "" });
  const [disp, setDisp] = useState({ reason_id: "", text: "", email: "" });
  useEffect(() => {
    api<Detail>(`/marketplace/returns/${id}`).then((x) => { setD(x); setOffer({ solution: x.solutions[0]?.solution ?? "", amount: "" }); })
      .catch((e) => setErr(errMsg(e, "Gagal mengambil rincian dari Shopee")));
  }, [id]);

  const act = async (action: "accept" | "offer" | "accept_offer" | "dispute", body: Record<string, unknown> = {}) => {
    if (action === "accept" && !(await askConfirm(`Setujui pengembalian ${d?.return.return_sn}? Dana ${rupiah(d?.return.refund_amount)} dikembalikan ke pembeli${d?.needs_logistics ? " setelah barang diterima kembali" : ""}. Tidak bisa dibatalkan.`, { title: "Setujui Pengembalian", confirmLabel: "Setujui", danger: true }))) return;
    if (action === "accept_offer" && !(await askConfirm(`Terima tawaran pembeli ${rupiah(d?.negotiation?.offer_amount)}?`, { title: "Terima Tawaran", confirmLabel: "Terima" }))) return;
    setBusy(action);
    try {
      const r = await api<{ message: string }>(`/marketplace/returns/${id}/act`, { method: "POST", json: { action, ...body } });
      onDone(r.message);
    } catch (e) { showAlert(errMsg(e, "Gagal memproses di Shopee"), "Gagal"); } finally { setBusy(""); }
  };

  const r = d?.return;
  const open = r && (r.status === "REQUESTED" || r.status === "PROCESSING");
  const maxRefund = d?.solutions.find((s) => s.solution === offer.solution)?.max_refund ?? d?.negotiation?.max_refund ?? r?.refund_amount ?? 0;
  const buyerOffer = d?.negotiation?.offer_amount != null && (d.negotiation.offer_by ?? "").toLowerCase().includes("buyer");

  return (
    <Dialog title={`Pengembalian · ${r?.return_sn ?? ""}`} icon={RotateCcw} onClose={onClose} width="max-w-2xl">
      {err ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p> : !d || !r ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" />Mengambil rincian dari Shopee…</p>
      ) : (
        <div className="space-y-4 text-sm">
          {d.error && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{d.error}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Pembeli</p><p className="font-medium text-navy">{r.buyer_username || "-"}</p></div>
            <div><p className="text-xs text-slate-500">No. Pesanan</p><p className="font-mono text-navy">{r.order_sn}</p></div>
            <div><p className="text-xs text-slate-500">Dana diminta</p><p className="font-semibold text-navy">{rupiah(r.refund_amount)}</p></div>
          </div>
          {r.text_reason && <p className="rounded-lg bg-slate-50 p-3 text-slate-700">“{r.text_reason}”</p>}
          {(d.images.length > 0 || d.videos.length > 0) && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Bukti dari pembeli</p>
              <div className="flex flex-wrap gap-2">
                {d.images.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" /></a>)}
                {d.videos.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-sky-600">Video {i + 1}</a>)}
              </div>
            </div>
          )}
          {d.negotiation?.offer_amount != null && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Tawaran terakhir {buyerOffer ? "pembeli" : "Anda"}: <b>{rupiah(d.negotiation.offer_amount)}</b>{d.negotiation.solution ? ` · ${SOLUTION[d.negotiation.solution] ?? d.negotiation.solution}` : ""}{d.negotiation.counter_limit != null ? ` · sisa tawar-menawar ${d.negotiation.counter_limit}x` : ""}</p>
          )}

          {!open ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Pengajuan ini tidak menunggu tanggapan penjual.</p> : (
            <>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => act("accept")} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{busy === "accept" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Setujui Pengembalian</button>
                {buyerOffer && <button onClick={() => act("accept_offer")} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 px-4 text-xs font-semibold text-emerald-700 disabled:opacity-50">Terima Tawaran Pembeli</button>}
                {d.solutions.length > 0 && <button onClick={() => setMode(mode === "offer" ? "" : "offer")} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-4 text-xs font-semibold ${mode === "offer" ? "border-[#ee4d2d] text-[#ee4d2d]" : "border-slate-200 text-navy"}`}>Tawarkan Solusi Lain</button>}
                <button onClick={() => setMode(mode === "dispute" ? "" : "dispute")} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-4 text-xs font-semibold ${mode === "dispute" ? "border-rose-400 text-rose-600" : "border-slate-200 text-navy"}`}><Scale size={14} />Ajukan Sengketa</button>
              </div>

              {mode === "offer" && (
                <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                  <label className="text-xs"><span className="mb-1 block font-medium text-slate-600">Solusi</span>
                    <select className="input h-9 w-full" value={offer.solution} onChange={(e) => setOffer({ ...offer, solution: e.target.value })}>
                      {d.solutions.map((s) => <option key={s.solution} value={s.solution}>{SOLUTION[s.solution] ?? s.solution}</option>)}
                    </select></label>
                  <label className="text-xs"><span className="mb-1 block font-medium text-slate-600">Dana dikembalikan (maks. {rupiah(maxRefund)})</span>
                    <input className="input h-9 w-full" inputMode="numeric" value={offer.amount} onChange={(e) => setOffer({ ...offer, amount: e.target.value.replace(/\D/g, "") })} /></label>
                  <button onClick={() => act("offer", { solution: offer.solution, amount: Number(offer.amount) })} disabled={!!busy || !offer.amount || Number(offer.amount) > maxRefund}
                    className="h-9 rounded-lg bg-[#ee4d2d] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy === "offer" ? <Loader2 size={14} className="animate-spin" /> : "Kirim Tawaran"}</button>
                </div>
              )}
              {mode === "dispute" && (
                <div className="space-y-2 rounded-xl border border-rose-200 p-3">
                  <p className="text-xs text-slate-500">Shopee akan meninjau bukti dari kedua pihak. Foto bukti (mis. potongan video packing) bisa dikirim di bagian Bukti Sengketa di bawah.</p>
                  {!d.dispute_reasons.length ? (
                    <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      Shopee belum memberikan pilihan alasan sengketa untuk pengajuan ini{d.dispute_error ? ` (${d.dispute_error})` : ""}. Biasanya sengketa baru bisa diajukan pada tahap tertentu, misalnya setelah barang retur diterima. Ajukan lewat{" "}
                      <a href="https://seller.shopee.co.id/portal/sale/returnrefundcancel" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Seller Centre</a>.
                    </p>
                  ) : (
                    <select className="input h-9 w-full" value={disp.reason_id} onChange={(e) => setDisp({ ...disp, reason_id: e.target.value })}>
                      <option value="">Pilih alasan sengketa…</option>
                      {d.dispute_reasons.map((x) => <option key={x.id} value={x.id}>{x.text}</option>)}
                    </select>
                  )}
                  <textarea className="input min-h-[90px] w-full py-2" placeholder="Jelaskan kenapa pengajuan ini tidak sesuai (min. 10 karakter)" value={disp.text} onChange={(e) => setDisp({ ...disp, text: e.target.value })} />
                  <input className="input h-9 w-full" type="email" placeholder="Email untuk dihubungi Shopee" value={disp.email} onChange={(e) => setDisp({ ...disp, email: e.target.value })} />
                  <div className="flex justify-end"><button onClick={() => act("dispute", { reason_id: Number(disp.reason_id), text: disp.text, email: disp.email })} disabled={!!busy || !disp.reason_id || disp.text.length < 10 || !disp.email}
                    className="h-9 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{busy === "dispute" ? <Loader2 size={14} className="animate-spin" /> : "Ajukan Sengketa"}</button></div>
                </div>
              )}
            </>
          )}
          {r.status !== "CLOSED" && r.status !== "CANCELLED" && <DisputeProof id={id} status={r.status} onDone={onDone} />}
        </div>
      )}
    </Dialog>
  );
}

type Proof = {
  images: { url: string; thumbnail: string }[]; videos: { url: string; thumbnail: string }[]; description: string | null;
  shipping: { mandatory: boolean; uploaded: boolean; tracking_required: boolean; image_required: boolean; carriers: { id: number; name: string }[] } | null;
};

/** Seller's dispute proof on Shopee (photos + text), seller-arranged return shipping proof, and cancelling a compensation dispute. */
function DisputeProof({ id, status, onDone }: { id: number; status: string; onDone: (msg: string) => void }) {
  const [p, setP] = useState<Proof | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [desc, setDesc] = useState("");
  const [ship, setShip] = useState({ carrier_id: "", tracking_number: "", remarks: "" });
  const [shipFiles, setShipFiles] = useState<File[]>([]);
  const load = () => api<Proof>(`/marketplace/returns/${id}/proof`).then(setP).catch((e) => showAlert(errMsg(e, "Gagal mengambil bukti dari Shopee"), "Gagal"));
  useEffect(() => { if (show && !p) load(); }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy("proof");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("photos[]", f));
      if (desc.trim()) fd.append("description", desc.trim());
      const r = await api<{ message: string }>(`/marketplace/returns/${id}/proof`, { method: "POST", body: fd });
      setFiles([]); setDesc(""); load(); showAlert(r.message, "Bukti terkirim");
    } catch (e) { showAlert(errMsg(e, "Gagal mengirim bukti"), "Gagal"); } finally { setBusy(""); }
  };
  const sendShip = async () => {
    setBusy("ship");
    try {
      const fd = new FormData();
      const c = p?.shipping?.carriers.find((x) => String(x.id) === ship.carrier_id);
      fd.append("carrier_id", ship.carrier_id);
      if (c) fd.append("carrier_name", c.name);
      if (ship.tracking_number) fd.append("tracking_number", ship.tracking_number);
      if (ship.remarks) fd.append("remarks", ship.remarks);
      shipFiles.forEach((f) => fd.append("photos[]", f));
      const r = await api<{ message: string }>(`/marketplace/returns/${id}/shipping-proof`, { method: "POST", body: fd });
      load(); showAlert(r.message, "Terkirim");
    } catch (e) { showAlert(errMsg(e, "Gagal mengirim bukti pengiriman"), "Gagal"); } finally { setBusy(""); }
  };
  const cancelDispute = async () => {
    const email = (await askText("Email untuk catatan Shopee", "", "Shopee mencatat email operator yang membatalkan sengketa."))?.trim();
    if (!email) return;
    setBusy("cancel");
    try {
      const r = await api<{ message: string }>(`/marketplace/returns/${id}/act`, { method: "POST", json: { action: "cancel_dispute", email } });
      onDone(r.message);
    } catch (e) { showAlert(errMsg(e, "Gagal membatalkan sengketa"), "Gagal"); } finally { setBusy(""); }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <button onClick={() => setShow(!show)} className="flex w-full items-center justify-between text-xs font-semibold text-navy"><span className="flex items-center gap-1.5"><ImagePlus size={14} />Bukti Sengketa dari Penjual</span><span className="text-slate-400">{show ? "Tutup" : "Buka"}</span></button>
      {show && (!p ? <p className="flex items-center gap-2 pt-3 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" />Mengambil bukti dari Shopee…</p> : (
        <div className="space-y-3 pt-3">
          {(p.images.length > 0 || p.videos.length > 0) ? (
            <div>
              <p className="mb-1.5 text-xs text-slate-500">Sudah terkirim ke Shopee</p>
              <div className="flex flex-wrap gap-2">
                {p.images.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer"><img src={x.thumbnail} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" /></a>)}
                {p.videos.map((x, i) => <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-sky-600">Video {i + 1}</a>)}
              </div>
              {p.description && <p className="mt-1.5 text-xs text-slate-600">“{p.description}”</p>}
            </div>
          ) : <p className="text-xs text-slate-500">Belum ada bukti dari penjual.</p>}
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 9))} className="block w-full text-xs" />
            <textarea className="input min-h-[70px] w-full py-2 text-xs" placeholder="Keterangan bukti (mis. foto dari video packing menunjukkan barang lengkap)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <p className="text-[11px] text-slate-500">Shopee hanya menerima foto JPG/PNG (maks. 10 MB, hingga 9 foto) lewat API. Video bukti tetap diunggah lewat Seller Centre.</p>
            <div className="flex justify-end"><button onClick={send} disabled={!!busy || !files.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-xs font-semibold text-white disabled:opacity-50">{busy === "proof" ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}Kirim {files.length || ""} Foto Bukti</button></div>
          </div>
          {p.shipping && p.shipping.carriers.length > 0 && !p.shipping.uploaded && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-navy"><Truck size={14} />Bukti pengiriman retur oleh penjual{p.shipping.mandatory ? " (wajib)" : ""}</p>
              <select className="input h-9 w-full text-xs" value={ship.carrier_id} onChange={(e) => setShip({ ...ship, carrier_id: e.target.value })}>
                <option value="">Pilih ekspedisi…</option>
                {p.shipping.carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="input h-9 w-full text-xs" placeholder={`No. resi${p.shipping.tracking_required ? " (wajib)" : ""}`} value={ship.tracking_number} onChange={(e) => setShip({ ...ship, tracking_number: e.target.value })} />
              <input type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setShipFiles(Array.from(e.target.files ?? []).slice(0, 3))} className="block w-full text-xs" />
              <div className="flex justify-end"><button onClick={sendShip} disabled={!!busy || !ship.carrier_id || (p.shipping.tracking_required && !ship.tracking_number) || (p.shipping.image_required && !shipFiles.length)}
                className="h-9 rounded-lg bg-navy px-4 text-xs font-semibold text-white disabled:opacity-50">{busy === "ship" ? <Loader2 size={14} className="animate-spin" /> : "Kirim Bukti Pengiriman"}</button></div>
            </div>
          )}
          {(status === "JUDGING" || status === "SELLER_DISPUTE") && (
            <div className="border-t border-slate-100 pt-3 text-right">
              <button onClick={cancelDispute} disabled={!!busy} className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50">{busy === "cancel" ? "Membatalkan…" : "Batalkan sengketa (khusus sengketa kompensasi)"}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Seller cancels an unshipped order because some products ran out: Shopee asks which ones. */
export function CancelStockDialog({ order: o, onClose, onDone }: { order: Order; onClose: () => void; onDone: (order: Order, msg: string) => void }) {
  const items = o.items ?? [];
  const [picked, setPicked] = useState<string[]>(items.length === 1 ? [`${items[0].item_id}:${items[0].model_id}`] : []);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!(await askConfirm(`Batalkan pesanan ${o.external_order_sn} karena stok habis? Pembatalan oleh penjual dapat menambah poin penalti toko di Shopee.`, { title: "Batalkan Pesanan", confirmLabel: "Batalkan", danger: true }))) return;
    setBusy(true);
    try {
      const r = await api<{ order: Order; message: string }>(`/marketplace/orders/${o.id}/cancel`, { method: "POST", json: { items: picked.map((k) => { const [item_id, model_id] = k.split(":").map(Number); return { item_id, model_id }; }) } });
      onDone(r.order, r.message);
    } catch (e) { showAlert(errMsg(e, "Gagal membatalkan pesanan"), "Gagal"); } finally { setBusy(false); }
  };
  return (
    <Dialog title={`Batalkan · ${o.external_order_sn}`} icon={PackageX} onClose={onClose} width="max-w-lg">
      <div className="space-y-3 text-sm">
        <p className="text-slate-600">Pilih produk yang stoknya habis:</p>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {items.map((i) => {
            const k = `${i.item_id}:${i.model_id}`;
            return (
              <label key={k} className="flex cursor-pointer items-center gap-3 px-3 py-2">
                <input type="checkbox" className="h-4 w-4 accent-[#ee4d2d]" checked={picked.includes(k)} onChange={(e) => setPicked(e.target.checked ? [...picked, k] : picked.filter((x) => x !== k))} />
                <span className="min-w-0 flex-1"><span className="block truncate text-slate-800">{i.name}</span>{i.variant && <span className="block text-xs text-slate-500">{i.variant}</span>}</span>
                <span className="text-xs text-slate-500">x{i.qty}</span>
              </label>
            );
          })}
        </div>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Pembatalan karena stok habis dihitung sebagai pesanan tidak terselesaikan dan bisa menambah poin penalti. Update stok setelah ini agar tidak terulang.</p>
        <div className="flex justify-end"><button onClick={submit} disabled={busy || !picked.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}Batalkan Pesanan</button></div>
      </div>
    </Dialog>
  );
}

/** Catatan penjual: private note on the order, saved to Shopee. */
export function SellerNote({ order: o, onSaved }: { order: Order; onSaved: (note: string | null) => void }) {
  const [v, setV] = useState(o.seller_note ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = v.trim() !== (o.seller_note ?? "");
  const save = async () => {
    setBusy(true); setSaved(false);
    try { const r = await api<{ seller_note: string | null }>(`/marketplace/orders/${o.id}/note`, { method: "PUT", json: { note: v } }); onSaved(r.seller_note); setSaved(true); }
    catch (e) { showAlert(errMsg(e, "Gagal menyimpan catatan"), "Gagal"); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <StickyNote size={16} className="text-[#ee4d2d]" />
        <b className="flex-1 text-sm text-slate-800">Catatan Penjual</b>
        {saved && !dirty && <span className="text-xs text-emerald-600">Tersimpan</span>}
      </div>
      <textarea className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#ee4d2d] focus:bg-white" rows={3} maxLength={500}
        placeholder="Tambahkan catatan…" value={v} onChange={(e) => { setV(e.target.value); setSaved(false); }} />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">Hanya terlihat oleh Anda · {v.length}/500</span>
        {dirty && <button onClick={save} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#ee4d2d] px-3 text-xs font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={13} className="animate-spin" />}Simpan</button>}
      </div>
    </div>
  );
}
