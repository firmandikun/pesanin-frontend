"use client";
import { Check, Copy, ExternalLink, Loader2, MapPin, PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/kit";
import { cleanCourier } from "@/lib/courier";
import { api, ApiError } from "@/lib/api";

type Tracking = {
  tracking_number: string | null; courier: string | null; status: string | null; source: "shopee" | "binderbyte" | "biteship" | "rajaongkir" | "pesanin";
  track_url: string | null; note: string | null; events: { time: string | null; text: string; location: string | null }[];
};

const SOURCE = { shopee: "Data dari Shopee", binderbyte: "Data langsung dari ekspedisi", biteship: "Data dari Biteship", rajaongkir: "Data dari RajaOngkir", pesanin: "Riwayat status di Pesanin" };
const when = (t: string | null) => t ? new Date(t).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/** "Cek resi" for any order: courier checkpoints, copyable AWB and the courier's own tracking page. */
export function TrackingModal({ orderId, title, onClose }: { orderId: number; title?: string; onClose: () => void }) {
  const [data, setData] = useState<Tracking | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Tracking>(`/orders/${orderId}/tracking`).then(setData).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat pelacakan"));
  }, [orderId]);

  const copy = () => { if (!data?.tracking_number) return; navigator.clipboard.writeText(data.tracking_number); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <Dialog title={title ?? "Lacak resi"} icon={PackageSearch} onClose={onClose} width="max-w-lg">
      {!data && !err && <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Mengambil status paket…</p>}
      {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">{cleanCourier(data.courier)}</p>
              <p className="truncate font-mono text-base font-bold text-navy">{data.tracking_number ?? "Resi belum terbit"}</p>
            </div>
            {data.tracking_number && <button onClick={copy} className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Disalin" : "Salin"}</button>}
          </div>
          {data.status && <p className="text-sm text-slate-600">Status: <b className="text-navy">{data.status}</b></p>}

          {data.events.length ? (
            <ol className="relative max-h-[50vh] space-y-4 overflow-y-auto pl-6">
              {data.events.map((e, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-6 top-1 h-3 w-3 rounded-full ${i === 0 ? "bg-brand-500 ring-4 ring-brand-100" : "bg-slate-300"}`} />
                  {i < data.events.length - 1 && <span className="absolute -left-[19px] top-4 h-[calc(100%+4px)] w-0.5 bg-slate-200" />}
                  <p className={`text-sm ${i === 0 ? "font-semibold text-navy" : "text-slate-600"}`}>{e.text}</p>
                  <p className="text-xs text-slate-400">{when(e.time)}{e.location && <><MapPin size={11} className="ml-2 mr-0.5 inline" />{e.location}</>}</p>
                </li>
              ))}
            </ol>
          ) : <p className="py-6 text-center text-sm text-slate-500">Belum ada riwayat perjalanan paket.</p>}

          {data.note && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">{data.note}</p>}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
            <span>{SOURCE[data.source]}</span>
            {data.track_url && data.tracking_number && (
              <a href={data.track_url} target="_blank" rel="noreferrer" onClick={copy} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">Buka situs {cleanCourier(data.courier).split(" ")[0]}<ExternalLink size={12} /></a>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
