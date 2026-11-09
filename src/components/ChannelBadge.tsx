import { Globe, PenLine } from "lucide-react";
import { TRAFFIC, trafficOf } from "@/lib/traffic";

/** Stylised Shopee mark (orange bag + S), not the official artwork. */
export function ShopeeMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <rect width="20" height="20" rx="5" fill="#ee4d2d" />
      <path d="M7.2 7.4V6.9a2.8 2.8 0 0 1 5.6 0v.5" fill="none" stroke="#fff" strokeWidth="1.3" />
      <text x="10" y="15.3" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">S</text>
    </svg>
  );
}

/**
 * Where an order came from. Shopee orders show the shop; web-checkout orders show the traffic source
 * that brought the buyer (from the ad's UTM tags), since the sale itself always happens on Pesanin's checkout.
 */
export function ChannelBadge({ channel, shop, utm }: { channel: string; shop?: string | null; utm?: string | null }) {
  if (channel === "shopee") {
    return (
      <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-md bg-[#fff1ee] px-2 py-1 text-xs font-medium text-[#c63c20]">
        <ShopeeMark size={14} /><span className="truncate">{shop?.replace(/^Contoh: /, "") ?? "Shopee"}</span>
      </span>
    );
  }
  if (channel === "manual") {
    return <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"><PenLine size={13} />Input manual</span>;
  }
  const t = TRAFFIC[trafficOf(utm)];
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500"><Globe size={12} />Checkout Web</span>
      <span className={`w-max rounded px-1.5 py-0.5 text-[11px] font-semibold ${t.cls}`}>{t.short}</span>
    </span>
  );
}
