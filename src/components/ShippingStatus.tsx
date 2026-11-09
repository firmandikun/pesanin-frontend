import { Check, PackageCheck, RotateCcw, Truck } from "lucide-react";

/**
 * Read-only delivery progress for web-checkout orders: the courier booking happens automatically
 * after checkout, so the seller only follows the status (not sent → on the way → received).
 */
const STEP: Record<string, number> = { not_shipped: 0, picked_up: 1, in_transit: 1, delivered: 2 };
const LABELS = ["Belum dikirim", "Dikirim", "Diterima"];

export function ShippingStatus({ status, tracking, courier, compact }: { status: string; tracking?: string | null; courier?: string | null; compact?: boolean }) {
  if (status === "returned") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"><RotateCcw size={12} />Dikembalikan</span>;
  }
  const step = STEP[status] ?? 0;
  const tone = ["bg-amber-50 text-amber-700", "bg-sky-50 text-sky-700", "bg-emerald-50 text-emerald-700"][step];
  const Icon = [Truck, Truck, PackageCheck][step];
  if (compact) {
    return (
      <span className="inline-flex flex-col gap-1">
        <span className={`inline-flex w-max items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${tone}`}><Icon size={12} />{LABELS[step]}</span>
        {tracking && <span className="font-mono text-[11px] text-slate-400">{tracking}</span>}
      </span>
    );
  }
  return (
    <div>
      <ol className="flex items-center">
        {LABELS.map((l, i) => (
          <li key={l} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400"}`}>{i < step ? <Check size={14} /> : i + 1}</span>
              <span className={`text-xs ${i <= step ? "font-semibold text-navy" : "text-slate-400"}`}>{l}</span>
            </span>
            {i < LABELS.length - 1 && <span className={`mx-2 mb-5 h-0.5 flex-1 ${i < step ? "bg-brand-500" : "bg-slate-200"}`} />}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-500">{courier ?? "Kurir"}{tracking ? <> · resi <b className="font-mono text-navy">{tracking}</b></> : " · resi terbit otomatis setelah paket dijemput"}</p>
    </div>
  );
}
