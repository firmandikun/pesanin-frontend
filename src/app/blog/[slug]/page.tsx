"use client";

import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArticleBody } from "@/components/marketing/ArticleBody";
import { SitePage } from "@/components/marketing/SiteChrome";
import { fmtPostDate, postBySlug, POSTS } from "@/lib/blog";
import { publicApi } from "@/lib/content";

type Article = { slug: string; title: string; category: string; date: string; minutes: number; body: string[]; cover?: string | null };

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Article | null | undefined>(undefined);
  const [others, setOthers] = useState<{ slug: string; title: string; category: string }[]>([]);

  useEffect(() => {
    publicApi<{ slug: string; title: string; category: string; published_at: string; minutes: number; body: string; cover_url: string | null }>(`/blog/${slug}`)
      .then((p) => setPost({ ...p, date: p.published_at, cover: p.cover_url, body: p.body.split("\n").filter((l) => l.trim()) }))
      .catch(() => { const p = postBySlug(slug); setPost(p ? { ...p } : null); });
    publicApi<{ data: { slug: string; title: string; category: string }[] }>("/blog")
      .then((r) => setOthers(r.data.filter((p) => p.slug !== slug).slice(0, 2)))
      .catch(() => setOthers(POSTS.filter((p) => p.slug !== slug).slice(0, 2)));
  }, [slug]);

  if (post === null) notFound();
  if (!post) return <SitePage><p className="py-32 text-center text-slate-400">Memuat artikel…</p></SitePage>;
  /* eslint-disable @next/next/no-img-element */
  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-4 py-14">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600"><ArrowLeft size={16} />Semua artikel</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-wide text-brand-600">{post.category}</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-navy md:text-[42px]">{post.title}</h1>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">{fmtPostDate(post.date)} · <Clock size={14} />{post.minutes} menit baca</p>
        {post.cover && <img src={post.cover} alt={post.title} className="mt-8 w-full rounded-3xl border border-slate-100 object-cover" />}
        <div className="mt-10"><ArticleBody lines={post.body} /></div>
        <div className="mt-12 rounded-3xl bg-navy p-8 text-white">
          <h2 className="text-2xl font-extrabold">Hitung semuanya otomatis dengan Pesanin</h2>
          <p className="mt-2 text-navy-200">Potongan Shopee, HPP, iklan, dan pengeluaran jadi satu laporan laba bersih.</p>
          <Link href="/register" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-6 font-bold text-white hover:bg-brand-600">Coba Gratis Sekarang <ArrowRight size={17} /></Link>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {others.map((p) => <Link key={p.slug} href={`/blog/${p.slug}`} className="rounded-2xl border border-slate-200 p-5 hover:border-brand-200 hover:shadow-md"><span className="text-xs font-bold uppercase text-brand-600">{p.category}</span><p className="mt-2 font-bold text-navy">{p.title}</p></Link>)}
        </div>
      </article>
    </SitePage>
  );
}
