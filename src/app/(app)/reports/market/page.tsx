"use client";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Loader2, Plus, Search, Star, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { ShopeeMark } from "@/components/ChannelBadge";
import { api, ApiError, rupiah } from "@/lib/api";

type Status = { shopee: boolean; trends: boolean; source: { shopee: "own" | "pesanin" | null; trends: "own" | "pesanin" | null }; quota: { limit: number | null; used: number }; periods: Record<string, string> };
type Item = { id: string; name: string; image: string | null; link: string | null; price_min: number; price_max: number; discount: number; sold: number; rating: number; commission: number; shop: string | null; shop_type: string | null; revenue_estimate: number };
type Band = { min: number; max: number; products: number; sold: number; sold_share: number };
type Analysis = { price_bands: Band[]; best_band: Band | null; shops: number; top3_share: number; non_mall_share: number; commission: { min: number; median: number; max: number } | null };
type ShopeeRes = { items: Item[]; has_next: boolean; analysis: Analysis; summary: { count: number; sold: number; revenue_estimate: number; price_min: number | null; price_median: number | null; price_max: number | null; rating: number | null; mall_share: number; top_shops: { shop: string; products: number; sold: number }[] } };
type TrendRes = { keywords: string[]; points: { date: string; timestamp: number; values: Record<string, number> }[]; summary: { keyword: string; average: number; latest: number; change: number | null; peak: string | null }[] };
type Related = { rising: { query: string; value: string | null; score: number }[]; top: { query: string; value: string | null; score: number }[]; regions: { region: string; value: number }[] };

// Validated categorical order (light surface, CVD-safe): brand orange first.
const SERIES = ["#e05510", "#4263c9", "#2a9d8f", "#9b51c9", "#b8860b"];
const short = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1).replace(".", ",")} M` : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} jt` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(".", ",")} rb` : String(n));

/** Riset Pasar: what sells on Shopee and what people search on Google, side by side. */
export default function MarketResearch() {
  const [tab, setTab] = useState<"shopee" | "trends">("shopee");
  const [status, setStatus] = useState<Status | null>(null);
  const [trendSeed, setTrendSeed] = useState<string | null>(null);
  const refresh = useCallback(() => { api<Status>("/research/status").then(setStatus); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const src = status?.source[tab];

  return (
    <div className="space-y-5">
      <PageHead title="Riset Pasar" tutorial={false} crumbs={[["Laporan"], ["Riset Pasar"]]} />
      <p className="-mt-2 text-sm text-slate-500">Cari ide produk: apa yang laris di Shopee dan apa yang sedang dicari orang di Google.</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-fit rounded-xl bg-white p-1">
        {([["shopee", "Shopee"], ["trends", "Google Trends"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${tab === k ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {k === "shopee" ? <ShopeeMark size={14} /> : <TrendingUp size={15} />}{l}
          </button>
        ))}
        </div>
        {status && src && (
          <span className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
            {src === "own" ? "Memakai akun milikmu · tanpa batas"
              : status.quota.limit === null ? "Riset tanpa batas" : <>Sisa riset hari ini: <b className={status.quota.limit - status.quota.used <= 0 ? "text-rose-600" : "text-navy"}>{Math.max(0, status.quota.limit - status.quota.used)}</b> / {status.quota.limit}</>}
          </span>
        )}
      </div>
      {!status ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Memuat…</p>
        : tab === "shopee"
          ? (status.shopee ? <ShopeeResearch onSearched={refresh} onTrend={(k) => { setTrendSeed(k); setTab("trends"); }} /> : <Unavailable what="Riset Shopee" />)
          : (status.trends ? <TrendsResearch onSearched={refresh} periods={status.periods} seed={trendSeed} /> : <Unavailable what="Riset Google Trends" />)}
    </div>
  );
}

/** Shown only when Pesanin's shared key isn't configured yet and the seller has none of their own. */
function Unavailable({ what }: { what: string }) {
  return (
    <Panel className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><TrendingUp size={22} /></span>
      <h2 className="text-lg font-bold text-navy">{what} segera hadir</h2>
      <p className="max-w-md text-sm text-slate-500">Fitur ini sedang disiapkan. Kalau punya akun sendiri, kamu bisa memakainya lewat Settings → Integrasi.</p>
      <Link href="/settings/integrations" className="mt-1 rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700">Pakai akun sendiri</Link>
    </Panel>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function ShopeeResearch({ onTrend, onSearched }: { onTrend: (k: string) => void; onSearched: () => void }) {
  const [q, setQ] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("sales");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<ShopeeRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!keyword) return;
    setBusy(true); setErr("");
    api<ShopeeRes>(`/research/shopee?${new URLSearchParams({ keyword, sort, page: String(page) })}`)
      .then(setRes).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal mengambil data Shopee")).finally(() => { setBusy(false); onSearched(); });
  }, [keyword, sort, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = res?.summary;
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 2) { setPage(1); setKeyword(q.trim()); } }} className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input h-11 pl-9" placeholder="Kata kunci produk, mis. serum vitamin c" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="input h-11 w-48" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
          <option value="sales">Terlaris</option><option value="relevance">Paling relevan</option>
          <option value="price_asc">Harga termurah</option><option value="price_desc">Harga termahal</option><option value="commission">Komisi tertinggi</option>
        </Select>
        <button className="flex h-11 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white">{busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}Riset</button>
      </form>

      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      {!keyword && <Panel className="p-10 text-center text-sm text-slate-500">Ketik kata kunci untuk melihat produk terlaris di Shopee: harga pasaran, jumlah terjual, rating, dan toko pesaing.</Panel>}

      {s && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Total terjual (produk teratas)" value={short(s.sold)} hint={`${s.count} produk`} />
            <Stat label="Estimasi omzet pasar" value={`Rp${short(s.revenue_estimate)}`} hint="terjual × harga terendah" />
            <Stat label="Harga pasaran (median)" value={s.price_median ? rupiah(s.price_median) : "-"} hint={s.price_min ? `${rupiah(s.price_min)} – ${rupiah(s.price_max ?? 0)}` : undefined} />
            <Stat label="Rating rata-rata" value={s.rating ? `${String(s.rating).replace(".", ",")} ★` : "-"} />
            <Stat label="Toko Mall" value={`${s.mall_share}%`} hint={s.mall_share > 40 ? "Persaingan dengan brand besar tinggi" : "Masih banyak toko non-Mall"} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Cek minat pencarian:</span>
            <button onClick={() => onTrend(keyword)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-navy hover:bg-slate-50"><TrendingUp size={14} />&quot;{keyword}&quot; di Google Trends</button>
            {s.top_shops.length > 0 && <span className="ml-auto text-xs text-slate-500">Toko terkuat: {s.top_shops.slice(0, 3).map((t) => `${t.shop} (${short(t.sold)})`).join(" · ")}</span>}
          </div>
        </>
      )}

      {res && res.analysis && res.items.length > 0 && <ProductAnalysis a={res.analysis} />}

      {res && (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3 font-semibold">#</th><th className="px-3 py-3 font-semibold">Produk</th><th className="px-3 py-3 text-right font-semibold">Harga</th><th className="px-3 py-3 text-right font-semibold">Terjual</th><th className="px-3 py-3 text-right font-semibold">Est. omzet</th><th className="px-3 py-3 font-semibold">Rating</th><th className="px-3 py-3 text-right font-semibold">Komisi</th><th className="px-3 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {res.items.map((it, i) => (
                <tr key={it.id} className="align-top">
                  <td className="px-4 py-3 text-slate-400">{(page - 1) * 30 + i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-3">
                      {it.image ? <img src={it.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" />}
                      <div className="min-w-0">
                        <p className="line-clamp-2 max-w-[360px] font-medium text-slate-700">{it.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">{it.shop_type && <span className="rounded bg-[#ee4d2d] px-1 text-[10px] font-bold text-white">{it.shop_type}</span>}{it.shop}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{rupiah(it.price_min)}{it.price_max > it.price_min && <span className="block text-xs text-slate-400">s/d {rupiah(it.price_max)}</span>}</td>
                  <td className="px-3 py-3 text-right font-semibold text-navy">{it.sold.toLocaleString("id-ID")}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">Rp{short(it.revenue_estimate)}</td>
                  <td className="px-3 py-3">{it.rating ? <span className="flex items-center gap-1 text-slate-600"><Star size={13} className="fill-amber-400 text-amber-400" />{String(it.rating).replace(".", ",")}</span> : <span className="text-slate-300">-</span>}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{it.commission ? `${String(it.commission).replace(".", ",")}%` : "-"}</td>
                  <td className="px-3 py-3">{it.link && <a href={it.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-brand-600">Lihat<ExternalLink size={12} /></a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!res.items.length && <p className="py-12 text-center text-sm text-slate-500">Tidak ada produk untuk kata kunci ini.</p>}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>Halaman {page}. Data dari Shopee Affiliate API; estimasi omzet = terjual × harga terendah.</span>
            <span className="flex gap-2">
              <button disabled={page <= 1 || busy} onClick={() => setPage(page - 1)} className="h-8 rounded-lg bg-slate-100 px-3 font-semibold disabled:opacity-40">Sebelumnya</button>
              <button disabled={!res.has_next || busy} onClick={() => setPage(page + 1)} className="h-8 rounded-lg bg-slate-100 px-3 font-semibold disabled:opacity-40">Berikutnya</button>
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}

/** Product analysis over the top products: price sweet spot, market concentration, commission range. */
function ProductAnalysis({ a }: { a: Analysis }) {
  const max = Math.max(1, ...a.price_bands.map((b) => b.sold_share));
  const band = (b: Band) => (b.min === b.max ? rupiah(b.min) : `${rupiah(b.min)} – ${rupiah(b.max)}`);
  const verdict = (() => {
    const out: string[] = [];
    if (a.best_band && a.best_band.sold_share >= 35) out.push(`Penjualan paling terkonsentrasi di harga ${band(a.best_band)} (${a.best_band.sold_share}% dari total terjual). Ini kisaran harga paling aman untuk ikut main.`);
    if (a.top3_share >= 60) out.push(`Pasar dikuasai sedikit toko: 3 toko teratas memegang ${a.top3_share}% penjualan — sulit ditembus pemain baru.`);
    else if (a.non_mall_share >= 60) out.push(`${a.non_mall_share}% penjualan dari toko non-Mall — peluang untuk penjual baru masih terbuka.`);
    return out.join(" ");
  })();

  return (
    <Panel className="space-y-4 p-5">
      <div><h2 className="font-bold text-navy">Analisis produk</h2><p className="text-xs text-slate-500">Dari produk teratas untuk kata kunci ini.</p></div>

      {a.price_bands.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Di harga berapa produk paling laku?</p>
          <div className="space-y-1.5">
            {a.price_bands.map((b, i) => {
              const best = a.best_band && b.min === a.best_band.min && b.max === a.best_band.max;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-right text-xs text-slate-500">{band(b)}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className={`flex h-full items-center rounded ${best ? "bg-brand-500" : "bg-slate-300"}`} style={{ width: `${Math.max(3, (b.sold_share / max) * 100)}%` }}>
                      <span className="px-2 text-xs font-semibold text-white">{b.sold_share}%</span>
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-xs text-slate-400">{short(b.sold)} terjual · {b.products} produk</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Konsentrasi pasar (3 toko teratas)" value={`${a.top3_share}%`} hint={`${a.shops} toko di hasil ini`} />
        <Stat label="Penjualan dari toko non-Mall" value={`${a.non_mall_share}%`} hint={a.non_mall_share >= 60 ? "Peluang pemain baru besar" : "Didominasi Mall/brand"} />
        <Stat label="Rentang komisi afiliasi" value={a.commission ? `${String(a.commission.min).replace(".", ",")}–${String(a.commission.max).replace(".", ",")}%` : "-"} hint={a.commission ? `median ${String(a.commission.median).replace(".", ",")}%` : undefined} />
      </div>

      {verdict && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{verdict}</p>}
    </Panel>
  );
}

function TrendsResearch({ periods, seed, onSearched }: { periods: Record<string, string>; seed: string | null; onSearched: () => void }) {
  const [keywords, setKeywords] = useState<string[]>(seed ? [seed] : []);
  const [draft, setDraft] = useState("");
  const [date, setDate] = useState("today 12-m");
  const [res, setRes] = useState<TrendRes | null>(null);
  const [focus, setFocus] = useState<string | null>(seed);
  const [related, setRelated] = useState<Related | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    if (!keywords.length) return;
    setBusy(true); setErr("");
    api<TrendRes>(`/research/trends?${new URLSearchParams({ q: keywords.join(","), date })}`)
      .then(setRes).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal mengambil Google Trends")).finally(() => { setBusy(false); onSearched(); });
  }, [keywords, date]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!focus) return setRelated(null);
    setRelated(null);
    api<Related>(`/research/trends/related?${new URLSearchParams({ q: focus, date })}`).then(setRelated).catch(() => setRelated({ rising: [], top: [], regions: [] }));
  }, [focus, date]);

  const add = (k: string) => {
    const v = k.trim().toLowerCase();
    if (!v || keywords.includes(v) || keywords.length >= 5) return;
    setKeywords([...keywords, v]); setDraft("");
    if (!focus) setFocus(v);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3">
        {keywords.map((k, i) => (
          <span key={k} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${focus === k ? "bg-navy text-white" : "bg-slate-100 text-slate-700"}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES[i] }} />
            <button onClick={() => setFocus(k)}>{k}</button>
            <button onClick={() => { const next = keywords.filter((x) => x !== k); setKeywords(next); if (focus === k) setFocus(next[0] ?? null); }} aria-label={`Hapus ${k}`}><X size={14} /></button>
          </span>
        ))}
        {keywords.length < 5 && (
          <form onSubmit={(e) => { e.preventDefault(); add(draft); }} className="flex min-w-[220px] flex-1 items-center gap-2">
            <input className="input h-9 flex-1" placeholder={keywords.length ? "Bandingkan kata kunci lain…" : "Ketik kata kunci, mis. serum vitamin c"} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white"><Plus size={15} />Tambah</button>
          </form>
        )}
        <Select className="input h-9 w-36" value={date} onChange={(e) => setDate(e.target.value)}>
          {Object.entries(periods).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>

      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      {!keywords.length && <Panel className="p-10 text-center text-sm text-slate-500">Tambahkan sampai 5 kata kunci untuk membandingkan minat pencarian di Indonesia.</Panel>}

      {res && keywords.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {res.summary.map((s, i) => (
              <button key={s.keyword} onClick={() => setFocus(s.keyword)} className={`rounded-xl bg-white p-4 text-left ring-2 transition ${focus === s.keyword ? "ring-navy" : "ring-transparent hover:ring-slate-200"}`}>
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-700"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i] }} />{s.keyword}</p>
                <p className="mt-1 text-xl font-bold text-navy">{s.average}<span className="text-xs font-normal text-slate-400"> /100 rata-rata</span></p>
                <p className="mt-0.5 flex items-center gap-1 text-xs">
                  {s.change === null ? <span className="text-slate-400">Data terlalu sedikit</span> : (
                    <span className={`flex items-center gap-0.5 font-semibold ${s.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{s.change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(s.change)}%</span>
                  )}
                  {s.change !== null && <span className="text-slate-400">awal vs akhir periode</span>}
                </p>
              </button>
            ))}
          </div>
          <Panel className="p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-bold text-navy">Minat pencarian di Indonesia</h2><p className="text-xs text-slate-500">Skala 0–100 relatif terhadap titik tertinggi. Bukan jumlah pencarian.</p></div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">{res.keywords.map((k, i) => <span key={k} className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[i] }} />{k}</span>)}</div>
            </div>
            {busy ? <div className="h-64 animate-pulse rounded-lg bg-slate-50" /> : <TrendChart res={res} />}
          </Panel>
        </>
      )}

      {focus && (
        <div className="grid gap-4 lg:grid-cols-3">
          {(["rising", "top"] as const).map((kind) => (
            <Panel key={kind} className="p-5">
              <h3 className="font-bold text-navy">{kind === "rising" ? "Kata kunci naik daun" : "Kata kunci terkait teratas"}</h3>
              <p className="mb-3 text-xs text-slate-500">untuk &quot;{focus}&quot;. Klik untuk membandingkan.</p>
              {!related ? <p className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat…</p>
                : related[kind].length ? (
                  <ul className="space-y-1.5">
                    {related[kind].map((r) => (
                      <li key={r.query}>
                        <button onClick={() => add(r.query)} disabled={keywords.length >= 5 || keywords.includes(r.query)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent">
                          <span className="truncate text-slate-700">{r.query}</span>
                          <span className={`shrink-0 text-xs font-semibold ${kind === "rising" ? "text-emerald-600" : "text-slate-500"}`}>{kind === "rising" ? (r.value === "Breakout" ? "Melonjak" : r.value) : r.score}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="py-6 text-sm text-slate-400">Belum cukup data.</p>}
            </Panel>
          ))}
          <Panel className="p-5">
            <h3 className="font-bold text-navy">Provinsi paling tertarik</h3>
            <p className="mb-3 text-xs text-slate-500">untuk &quot;{focus}&quot; (0–100)</p>
            {!related ? <p className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />Memuat…</p>
              : related.regions.length ? (
                <ul className="space-y-2.5">
                  {related.regions.slice(0, 10).map((r) => (
                    <li key={r.region} className="text-sm">
                      <div className="flex justify-between gap-2"><span className="truncate text-slate-700">{r.region}</span><b className="text-navy">{r.value}</b></div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${r.value}%`, background: SERIES[1] }} /></div>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-6 text-sm text-slate-400">Belum cukup data.</p>}
          </Panel>
        </div>
      )}
    </div>
  );
}

/** Multi-series line chart, one 0–100 axis, crosshair tooltip on hover. */
function TrendChart({ res }: { res: TrendRes }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 260, P = { l: 34, r: 12, t: 12, b: 26 };
  const n = res.points.length;
  if (!n) return <p className="flex h-64 items-center justify-center text-sm text-slate-400">Volume pencarian terlalu kecil untuk ditampilkan.</p>;
  const x = (i: number) => P.l + (n === 1 ? (W - P.l - P.r) / 2 : (i / (n - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + ((100 - v) / 100) * (H - P.t - P.b);
  const every = Math.max(1, Math.ceil(n / 7));
  const label = (p: TrendRes["points"][number]) => new Date(p.timestamp * 1000).toLocaleDateString("id-ID", n > 60 ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });
  const h = hover !== null ? res.points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" role="img" aria-label="Grafik minat pencarian Google Trends" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1))))); }}>
        {[0, 25, 50, 75, 100].map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f6"} /><text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{t}</text></g>)}
        {res.points.map((p, i) => i % every === 0 && <text key={p.timestamp} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">{label(p)}</text>)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#cbd5e1" />}
        {res.keywords.map((k, ki) => (
          <path key={k} d={res.points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.values[k] ?? 0)}`).join(" ")} fill="none" stroke={SERIES[ki]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && res.keywords.map((k, ki) => <circle key={k} cx={x(hover)} cy={y(res.points[hover].values[k] ?? 0)} r="4.5" fill={SERIES[ki]} stroke="white" strokeWidth="2" />)}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 z-10 w-52 rounded-lg bg-navy px-3 py-2 text-xs text-white shadow-lg" style={{ left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 104px), calc(100% - 208px))` }}>
          <p className="mb-1 font-semibold">{h.date}</p>
          {res.keywords.map((k, ki) => <p key={k} className="flex justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SERIES[ki] }} /><span className="truncate">{k}</span></span>{h.values[k] ?? 0}</p>)}
        </div>
      )}
    </div>
  );
}
