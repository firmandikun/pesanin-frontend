"use client";

import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SitePage } from "@/components/marketing/SiteChrome";
import { fmtPostDate, POSTS } from "@/lib/blog";
import { publicApi } from "@/lib/content";

type Card = { slug: string; title: string; category: string; excerpt: string; date: string; minutes: number; cover_url?: string | null };
const FALLBACK: Card[] = POSTS.map(({ slug, title, category, excerpt, date, minutes }) => ({ slug, title, category, excerpt, date, minutes }));

export default function Blog() {
  const [posts, setPosts] = useState<Card[] | null>(null);
  useEffect(() => {
    publicApi<{ data: { slug: string; title: string; category: string; excerpt: string; published_at: string; minutes: number; cover_url: string | null }[] }>("/blog")
      .then((r) => setPosts(r.data.map((p) => ({ ...p, date: p.published_at }))))
      .catch(() => setPosts(FALLBACK));
  }, []);
  if (!posts) return <SitePage><p className="py-32 text-center text-slate-400">Memuat artikel…</p></SitePage>;
  if (!posts.length) return <SitePage><p className="py-32 text-center text-slate-500">Belum ada artikel.</p></SitePage>;
  const [first, ...rest] = posts;
  return (
    <SitePage>
      <section className="border-b border-slate-100 bg-[#fbfaf8]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Blog</span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-navy md:text-5xl">Belajar kelola jualan & keuangan online</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">Potongan marketplace, HPP, iklan, dan tips operasional untuk seller Indonesia.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14">
        <Link href={`/blog/${first.slug}`} className="group grid gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-8 transition hover:shadow-lg md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">{first.category} · Terbaru</span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-navy group-hover:text-brand-600 md:text-3xl">{first.title}</h2>
            <p className="mt-3 text-slate-600">{first.excerpt}</p>
            <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">{fmtPostDate(first.date)} · <Clock size={14} />{first.minutes} menit baca</p>
          </div>
          <div className="flex flex-col items-end justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {first.cover_url && <img src={first.cover_url} alt="" className="w-full rounded-2xl object-cover" />}
            <span className="flex items-center gap-2 font-bold text-brand-600">Baca artikel <ArrowRight size={18} /></span>
          </div>
        </Link>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.cover_url ? <img src={p.cover_url} alt="" className="aspect-[1.91/1] w-full object-cover" /> : <div className="flex aspect-[1.91/1] items-end bg-gradient-to-br from-brand-400 to-brand-600 p-5"><span className="line-clamp-2 text-lg font-extrabold leading-tight text-white">{p.title}</span></div>}
              <div className="flex flex-1 flex-col p-6">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-600">{p.category}</span>
              <h2 className="mt-3 text-lg font-extrabold leading-snug text-navy group-hover:text-brand-600">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{p.excerpt}</p>
              <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">{fmtPostDate(p.date)} · <Clock size={13} />{p.minutes} menit</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SitePage>
  );
}
