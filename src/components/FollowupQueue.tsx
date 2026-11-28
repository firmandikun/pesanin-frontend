"use client";
import { CheckCircle2, ChevronRight, Loader2, MessageCircle, SkipForward, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError, rupiah } from "@/lib/api";
import { Modal } from "@/components/ui";

type Item = {
  id: number; code: string; customer_name: string; phone: string; product: string | null; total: number; is_abandoned: boolean;
  followup_count: number; event: string; template: string; message: string; free_api: boolean;
};

/**
 * Antrean follow up: one order at a time, message already filled in. "Kirim" opens the CS's own WhatsApp (free) or,
 * when the buyer chatted the WhatsApp Cloud number in the last 24 hours, sends it through the official API (also free).
 */
export function FollowupQueue({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({ manual: 0, api: 0, skipped: 0 });
  const [err, setErr] = useState("");

  useEffect(() => { api<{ orders: Item[] }>("/orders/followup-queue").then((r) => setItems(r.orders)).catch(() => setItems([])); }, []);
  const cur = items?.[i];
  useEffect(() => { setText(cur?.message ?? ""); setErr(""); }, [cur]);

  const next = () => setI((n) => n + 1);
  const send = async (manual = false) => {
    if (!cur) return;
    const viaApi = cur.free_api && !manual;
    // Open the tab inside the click, so the popup blocker lets it through; it gets the wa.me address after the call.
    const tab = viaApi ? null : window.open("", "_blank");
    setBusy(true); setErr("");
    try {
      const r = await api<{ via: "api" | "manual"; url: string | null }>(`/orders/${cur.id}/followup`, { method: "POST", json: { event: cur.event, message: text, manual } });
      if (r.via === "manual" && r.url) { if (tab) tab.location.href = r.url; else window.open(r.url, "_blank"); }
      else tab?.close();
      setDone((d) => ({ ...d, [r.via]: d[r.via] + 1 }));
      onSent();
      next();
    } catch (e) {
      tab?.close();
      setErr(e instanceof ApiError ? e.message : "Gagal mengirim follow up");
    } finally { setBusy(false); }
  };

  const total = items?.length ?? 0;
  return (
    <Modal open onClose={onClose} title="Antrean Follow Up" icon={MessageCircle} wide>
      <div className="space-y-4 p-5">
        {!items ? <p className="py-10 text-center text-sm text-slate-400">Memuat antrean…</p>
          : !cur ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <p className="mt-3 font-bold text-navy">{total ? "Antrean selesai" : "Tidak ada pesanan yang perlu di-follow up"}</p>
              {total > 0 && <p className="mt-1 text-sm text-slate-500">{done.manual} lewat WhatsApp CS · {done.api} otomatis gratis (jendela 24 jam) · {done.skipped} dilewati</p>}
              <button className="btn-primary mx-auto mt-5" onClick={onClose}>Tutup</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Pesanan {i + 1} dari {total}</span>
                <span className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-brand-500" style={{ width: `${(i / total) * 100}%` }} /></span>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 text-sm">
                <p className="flex flex-wrap items-center gap-2"><b className="text-navy">{cur.customer_name}</b><span className="text-slate-500">{cur.phone}</span>
                  {cur.is_abandoned && <span className="badge bg-amber-100 text-amber-700">Checkout ditinggalkan</span>}</p>
                <p className="mt-1 text-slate-600">{cur.code} · {cur.product ?? "-"} · {rupiah(cur.total)} · sudah di-follow up {cur.followup_count}×</p>
              </div>
              <div>
                <label className="label">Pesan ({cur.template}) — bisa diedit sebelum dikirim</label>
                <textarea className="input min-h-[160px] font-sans text-sm" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              {cur.free_api
                ? <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><Zap size={14} className="mt-0.5 shrink-0" />Pembeli chat ke nomor WhatsApp bisnis dalam 24 jam terakhir: pesan dikirim otomatis lewat API resmi, gratis.</p>
                : <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Dikirim dari WhatsApp CS sendiri (gratis): tab WhatsApp terbuka dengan pesan siap, tinggal tekan kirim lalu kembali ke sini.</p>}
              {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button className="btn-outline" disabled={busy} onClick={() => { setDone((d) => ({ ...d, skipped: d.skipped + 1 })); next(); }}><SkipForward size={15} />Lewati</button>
                {cur.free_api && <button className="btn-outline" disabled={busy || !text.trim()} onClick={() => send(true)}>Pakai WhatsApp CS</button>}
                <button className="btn-primary" disabled={busy || !text.trim()} onClick={() => send()}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : cur.free_api ? <Zap size={15} /> : <MessageCircle size={15} />}
                  {cur.free_api ? "Kirim otomatis" : "Kirim via WhatsApp"}<ChevronRight size={15} />
                </button>
              </div>
            </>
          )}
      </div>
    </Modal>
  );
}
