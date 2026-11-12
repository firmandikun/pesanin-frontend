"use client";

import { BookOpen, CheckCircle2, Clock, PlayCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { isNew, publicApi, type Tutorial, TUTORIAL_CATEGORIES, youtubeId } from "@/lib/content";

const CAT_TONE: Record<string, string> = { pemula: "bg-emerald-50 text-emerald-700", analitik: "bg-sky-50 text-sky-700", lanjutan: "bg-violet-50 text-violet-700" };

/** Finkami-style tutorial grid: category filter, Baru/Populer sort, video cards, and a viewer with the written steps. */
export function TutorialLibrary({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Tutorial[] | null>(null);
  const [cat, setCat] = useState<"" | keyof typeof TUTORIAL_CATEGORIES>("");
  const [sort, setSort] = useState<"baru" | "populer">("baru");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Tutorial | null>(null);

  useEffect(() => { publicApi<{ data: Tutorial[] }>("/tutorials").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  useEffect(() => {
    if (!open) return;
    publicApi(`/tutorials/${open.slug}/view`).catch(() => {});
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const list = useMemo(() => {
    const f = (items ?? []).filter((t) => (!cat || t.category === cat) && (t.title + t.description).toLowerCase().includes(q.toLowerCase()));
    return sort === "populer" ? [...f].sort((a, b) => b.views - a.views) : f;
  }, [items, cat, sort, q]);

  const chip = (on: boolean) => `h-9 rounded-full px-4 text-sm font-semibold transition ${on ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-slate-500">Kategori:</span>
        {([["", "Semua"], ...Object.entries(TUTORIAL_CATEGORIES)] as [string, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setCat(v as typeof cat)} className={chip(cat === v)}>{l}</button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tutorial" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-400" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-slate-500">{items ? <>Ditemukan <b className="text-navy">{list.length}</b> tutorial</> : "Memuat tutorial…"}</span>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["baru", "populer"] as const).map((s) => <button key={s} onClick={() => setSort(s)} className={`h-8 rounded-lg px-3 font-semibold capitalize ${sort === s ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}>{s === "baru" ? "Baru" : "Populer"}</button>)}
        </div>
      </div>

      <div className={`mt-5 grid gap-5 sm:grid-cols-2 ${compact ? "xl:grid-cols-3" : "lg:grid-cols-3"}`}>
        {list.map((t) => {
          const vid = youtubeId(t.video_url);
          return (
            <button key={t.id} onClick={() => setOpen(t)} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-navy/5">
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700">
                {vid
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={t.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  : <div className="flex h-full flex-col justify-between p-5 text-white"><LogoMark size={30} /><p className="line-clamp-2 text-lg font-extrabold leading-tight">{t.title}</p></div>}
                <span className="absolute inset-0 flex items-center justify-center bg-navy/0 transition group-hover:bg-navy/20">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-brand-600 shadow-lg transition group-hover:scale-110">{vid ? <PlayCircle size={30} /> : <BookOpen size={24} />}</span>
                </span>
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {isNew(t.created_at) && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">Baru</span>}
                </div>
                {t.duration && <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white"><Clock size={11} />{t.duration}</span>}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CAT_TONE[t.category]}`}>{TUTORIAL_CATEGORIES[t.category]}</span>
                <h3 className="mt-2.5 font-extrabold leading-snug text-navy group-hover:text-brand-600">{t.title}</h3>
                <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-500">{t.description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">{vid ? <><PlayCircle size={16} />Tonton Tutorial</> : <><BookOpen size={16} />Baca Panduan</>}</span>
              </div>
            </button>
          );
        })}
      </div>
      {items && list.length === 0 && <p className="py-16 text-center text-slate-500">Tidak ada tutorial yang cocok.</p>}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 pt-10 backdrop-blur-sm" onClick={() => setOpen(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {youtubeId(open.video_url) && (
              <div className="aspect-video w-full bg-black">
                <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId(open.video_url)}?autoplay=1&rel=0`} title={open.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )}
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CAT_TONE[open.category]}`}>{TUTORIAL_CATEGORIES[open.category]}</span>
                  <h2 className="mt-2 text-2xl font-extrabold text-navy">{open.title}</h2>
                  <p className="mt-1 text-slate-500">{open.description}</p>
                </div>
                <button onClick={() => setOpen(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Tutup"><X size={20} /></button>
              </div>
              {(open.steps?.length ?? 0) > 0 && (
                <ol className="mt-6 space-y-3">
                  {open.steps!.map((s, i) => <li key={i} className="flex gap-3 text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span><span className="leading-relaxed">{s}</span></li>)}
                </ol>
              )}
              <p className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} />Masih bingung? Tim kami siap memandu lewat WhatsApp.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
