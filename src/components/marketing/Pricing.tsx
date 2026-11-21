"use client";
import { Building2, Check, Minus, Star, Store, Megaphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSiteConfig } from "@/lib/site";
import { WaLink } from "@/components/marketing/Contact";
import { ADDON_DISCOUNT, CATALOG, COMPARE, ENTERPRISE, ENTERPRISE_FROM, ENTERPRISE_TO, TRACKS, YEARLY_DISCOUNT, rupiah, type Plan, type Track } from "@/lib/plans";

const fmtJt = (n: number) => `Rp${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;

/**
 * Pricing in two tracks (GTM Playbook v2.0): Marketplace (Shopee sellers) and Social & Web (Meta Ads, WhatsApp,
 * IG & COD), 4 self-serve plans each plus Enterprise. Prices & quotas follow Console → Paket & Fitur.
 */
export function Pricing({ initialTrack = "marketplace" }: { initialTrack?: Track }) {
  const [track, setTrack] = useState<Track>(initialTrack);
  const [yearly, setYearly] = useState(false);
  const [catalog, setCatalog] = useState(CATALOG);
  const [discount, setDiscount] = useState(YEARLY_DISCOUNT);
  useEffect(() => {
    loadSiteConfig().then((s) => {
      if (!s?.pricing) return;
      setDiscount(s.pricing.yearly_discount);
      setCatalog((cur) => Object.fromEntries((Object.keys(cur) as Track[]).map((t) => [t, cur[t].map((p) => {
        const live = s.pricing!.catalog[t]?.find((x) => x.id === p.id);
        return live ? { ...p, name: live.name, monthly: live.monthly, orders: live.limits.orders ?? null } : p;
      })])) as typeof CATALOG);
    });
  }, []);
  const perMonth = (p: Plan) => (yearly ? Math.floor((p.monthly * (100 - discount)) / 100 / 1000) * 1000 : p.monthly);
  const t = TRACKS[track];

  return (
    <div>
      {/* Track tabs */}
      <div className="mx-auto mb-6 grid max-w-2xl grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
        {(Object.keys(TRACKS) as Track[]).map((k) => {
          const Icon = k === "marketplace" ? Store : Megaphone;
          return (
            <button key={k} type="button" onClick={() => setTrack(k)}
              className={`flex flex-col items-center rounded-xl px-4 py-3 transition ${track === k ? "bg-white shadow-sm" : "hover:bg-white/60"}`}>
              <span className={`flex items-center gap-2 font-bold ${track === k ? "text-brand-600" : "text-slate-600"}`}><Icon size={17} />{TRACKS[k].name}</span>
              <span className="text-xs text-slate-500">{TRACKS[k].tagline}</span>
            </button>
          );
        })}
      </div>
      <p className="mx-auto mb-8 max-w-2xl text-center text-slate-600">{t.promise}</p>

      <div className="mb-10 flex items-center justify-center gap-3">
        <span className={`text-sm font-semibold transition ${!yearly ? "text-navy" : "text-slate-400"}`}>Bulanan</span>
        <button type="button" onClick={() => setYearly((v) => !v)} aria-label="Ganti periode tagihan"
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${yearly ? "bg-brand-500" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${yearly ? "left-[22px]" : "left-0.5"}`} />
        </button>
        <span className={`text-sm font-semibold transition ${yearly ? "text-navy" : "text-slate-400"}`}>Tahunan</span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Hemat {discount}%</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {catalog[track].map((p) => {
          const free = p.monthly === 0;
          const pm = perMonth(p);
          return (
            <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-white p-6 transition ${p.highlight ? "border-brand-400 bg-brand-50/40 shadow-xl shadow-brand-500/10" : "border-slate-200 hover:shadow-md"}`}>
              {p.highlight && <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200"><Star size={11} className="fill-brand-500 text-brand-500" />Paling Laris</span>}
              <h3 className="text-lg font-extrabold text-navy">{p.name}</h3>
              <p className="mt-1 min-h-[34px] text-xs text-slate-500">{p.tagline}</p>
              <div className="mt-3">
                {free ? <p className="text-[28px] font-extrabold leading-none text-navy">Rp0</p>
                  : <p className="leading-none"><span className="text-[28px] font-extrabold tracking-tight text-navy">{rupiah(pm)}</span><span className="text-sm text-slate-500">/bln</span></p>}
                <p className="mt-2 text-xs text-slate-400">{free ? "Selamanya, tanpa kartu kredit" : yearly ? `${rupiah(pm * 12)} ditagih tahunan` : "Ditagih bulanan"}</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-navy">Maks. {p.orders?.toLocaleString("id-ID") ?? "∞"} pesanan/bln</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-left text-sm text-slate-600">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-500" strokeWidth={2.6} />{f}</li>)}
              </ul>
              <Link href={`/register?track=${track}&plan=${p.id}${yearly && !free ? "&billing=yearly" : ""}`}
                className={`mt-5 flex h-11 items-center justify-center rounded-xl text-sm font-bold transition ${p.highlight ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-brand-300 text-brand-600 hover:bg-brand-50"}`}>
                {free ? "Mulai Gratis" : "Coba Gratis 7 Hari"}
              </Link>
            </div>
          );
        })}

        {/* Enterprise: price anchor + case study */}
        <div className="flex flex-col rounded-2xl border border-navy/20 bg-navy p-6 text-white">
          <h3 className="flex items-center gap-2 text-lg font-extrabold"><Building2 size={18} />Enterprise</h3>
          <p className="mt-1 min-h-[34px] text-xs text-white/70">{ENTERPRISE[track].tagline}</p>
          <div className="mt-3"><p className="text-xs text-white/70">Mulai</p><p className="text-[24px] font-extrabold leading-tight">{fmtJt(ENTERPRISE_FROM)} – {fmtJt(ENTERPRISE_TO)}+</p><p className="mt-1 text-xs text-white/60">/bulan · kontrak tahunan custom</p></div>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm text-white/85">
            {ENTERPRISE[track].features.map((f) => <li key={f} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" strokeWidth={2.6} />{f}</li>)}
          </ul>
          <p className="mt-4 rounded-lg bg-white/10 p-2.5 text-[11px] leading-snug text-white/85"><b>Studi kasus:</b> seller volume tinggi pindah dari sistem Rp10 jt/bln ke Pesanin Rp3,5 jt/bln, <b>hemat 65%</b> dengan laba bersih yang lebih akurat.</p>
          <WaLink text={`Halo tim Pesanin, saya mau jadwalkan demo & audit sistem untuk paket Enterprise (${TRACKS[track].short})`} target="_blank" rel="noopener noreferrer"
            className="mt-4 flex h-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-navy transition hover:bg-white/90">Jadwalkan Demo</WaLink>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Harga belum termasuk PPN 11%. Biaya payment gateway & ongkir dibayar sesuai tarif mitra. Jualan di Shopee sekaligus Meta Ads/WhatsApp?
        Tambahkan jalur {TRACKS[track === "marketplace" ? "social" : "marketplace"].short} sebagai add-on, <b className="text-slate-500">hemat {ADDON_DISCOUNT}%</b>.
      </p>

      <details className="group mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 font-semibold text-navy">
          Bandingkan fitur {t.short}
          <span className="text-sm font-medium text-brand-600 group-open:hidden">Lihat tabel →</span>
          <span className="hidden text-sm font-medium text-brand-600 group-open:inline">Tutup ↑</span>
        </summary>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3">Fitur</th>
              {catalog[track].map((p) => <th key={p.id} className={`px-5 py-3 text-center ${p.highlight ? "text-brand-600" : ""}`}>{p.name}</th>)}
            </tr></thead>
            <tbody>
              {COMPARE[track].map(([label, vals]) => (
                <tr key={label} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-slate-700">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className={`px-5 py-3 text-center ${catalog[track][i]?.highlight ? "bg-brand-50/30" : ""}`}>
                      {v === true ? <Check size={17} className="mx-auto text-emerald-500" strokeWidth={2.6} /> : v === false ? <Minus size={17} className="mx-auto text-slate-300" /> : <span className="font-semibold text-navy">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
