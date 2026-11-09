"use client";
import { MapPin } from "lucide-react";
import { Rate, rupiah } from "@/lib/api";
import { CourierLogo } from "./Logos";

type Opts = { hide_origin?: boolean; hide_courier?: boolean; show_original_price?: boolean };

/** "Pengiriman:" block: origin badge + courier radio list, used by checkout and the editor preview. */
export function ShippingOptions({ origin, rates, selected, onSelect, opts = {}, name = "courier" }: {
  origin: string | null; rates: (Rate & { original_cost?: number })[]; selected?: string; onSelect?: (code: string) => void; opts?: Opts; name?: string;
}) {
  if (!origin) return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Penjual belum mengatur alamat pengiriman (My Address).</p>;
  if (!rates.length) return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Pengiriman ke lokasi ini tidak tersedia.</p>;
  const chosen = rates.find((r) => r.code === selected) ?? rates.find((r) => r.cheapest);
  return (
    <div className="space-y-2">
      {!opts.hide_origin && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
          <MapPin size={16} />Dikirim dari {origin.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())}
        </div>
      )}
      {opts.hide_courier ? (
        <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm">Ongkos kirim: <b>{rupiah(chosen?.cost ?? 0)}</b> <span className="text-slate-500">(estimasi {chosen?.etd})</span></div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          {rates.map((r) => (
            <label key={r.code} className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-0 ${selected === r.code ? "bg-brand-50/60" : ""}`}>
              <input type="radio" name={name} className="h-4 w-4 accent-brand-600" checked={selected === r.code} onChange={() => onSelect?.(r.code)} />
              <CourierLogo code={r.courier ?? r.code} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-ink">{r.name}-{r.service}{r.cheapest && <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Termurah</span>}</span>
                <span className="block text-[13px] text-slate-500">Estimasi {r.etd}</span>
              </span>
              <span className="text-right">
                <b className="text-[15px] text-slate-800">{rupiah(r.cost)}</b>
                {opts.show_original_price && (r.original_cost ?? 0) > r.cost && <span className="block text-xs text-slate-400 line-through">{rupiah(r.original_cost!)}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
