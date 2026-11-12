"use client";

import { Eye, FileText, Pencil, Plus, Search, Send, Trash2 } from "lucide-react";
import { askConfirm } from "@/components/Dialogs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pager, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, Paginated } from "@/lib/api";

type Post = { id: number; slug: string; title: string; category: string; excerpt: string; cover_url: string | null; is_published: boolean; published_at: string | null; views: number; updated_at: string };

const statusOf = (p: Post) => (!p.is_published ? "draft" : p.published_at && new Date(p.published_at) > new Date() ? "scheduled" : "published");
const BADGE = { draft: ["Draf", "bg-slate-100 text-slate-600"], scheduled: ["Terjadwal", "bg-amber-50 text-amber-700"], published: ["Tayang", "bg-emerald-50 text-emerald-700"] } as const;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");

/** Console → Blog: every article with status, views, and quick actions. */
export default function BlogAdmin() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [cats, setCats] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Post> & { total: number } | null>(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, views: 0 });

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(search ? { search } : {}), ...(status ? { status } : {}), ...(category ? { category } : {}) });
    api<Paginated<Post> & { total: number }>(`/admin/content/blog-posts?${q}`).then(setData);
  }, [page, perPage, search, status, category]);
  const loadStats = useCallback(() => {
    api<Record<string, number>>("/admin/blog-categories").then(setCats);
    api<Paginated<Post> & { total: number }>("/admin/content/blog-posts?per_page=1000").then((r) => setStats({
      total: r.total, published: r.data.filter((p) => statusOf(p) === "published").length, draft: r.data.filter((p) => !p.is_published).length, views: r.data.reduce((a, p) => a + p.views, 0),
    }));
  }, []);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(loadStats, [loadStats]);

  const publish = async (p: Post, on: boolean) => {
    if (on && !(await askConfirm(`"${p.title}" akan langsung tampil di halaman blog.`, { title: "Tayangkan artikel?", confirmLabel: "Tayangkan" }))) return;
    await api(`/admin/content/blog-posts/${p.id}`, { method: "PUT", json: { ...(await api<Record<string, unknown>>(`/admin/content/blog-posts/${p.id}`)), is_published: on, published_at: on ? new Date().toISOString().slice(0, 10) : p.published_at?.slice(0, 10) } });
    load(); loadStats();
  };
  const remove = async (p: Post) => { if (await askConfirm(`Hapus artikel "${p.title}"? Artikel hilang dari blog dan tidak bisa dikembalikan.`, { title: "Hapus artikel?" })) { await api(`/admin/content/blog-posts/${p.id}`, { method: "DELETE" }); load(); loadStats(); } };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Blog</h1><p className="text-sm text-slate-500">Tulis dan kelola artikel di <a href="/blog" target="_blank" className="font-semibold text-brand-600">pesaninn.my.id/blog</a>.</p></div>
        <Link href="/admin/blog/new" className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"><Plus size={16} />Tulis artikel</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Total artikel", stats.total], ["Tayang", stats.published], ["Draf", stats.draft], ["Total dibaca", stats.views]].map(([l, v]) => (
          <Panel key={l as string} className="p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{(v as number).toLocaleString("id-ID")}</p></Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari judul artikel" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <Select className="input h-10 w-44" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">Semua kategori</option>{Object.entries(cats).map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}</Select>
          {[["", "Semua"], ["published", "Tayang"], ["scheduled", "Terjadwal"], ["draft", "Draf"]].map(([v, l]) => <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={`h-10 rounded-lg border px-3 text-sm font-medium ${status === v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>)}
        </div>
        <div className="divide-y divide-slate-100">
          {(data?.data ?? []).map((p) => {
            const st = statusOf(p);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.cover_url ? <img src={p.cover_url} alt="" className="h-16 w-28 rounded-lg object-cover" /> : <span className="flex h-16 w-28 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><FileText size={20} /></span>}
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/blog/${p.id}`} className="font-bold text-slate-900 hover:text-brand-600">{p.title}</Link>
                  <p className="truncate text-sm text-slate-500">{p.excerpt}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{p.category}</span>{date(p.published_at)} · <Eye size={12} />{p.views.toLocaleString("id-ID")} dibaca</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${BADGE[st][1]}`}>{BADGE[st][0]}</span>
                <div className="flex">
                  {st === "draft" && <button onClick={() => publish(p, true)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Tayangkan sekarang"><Send size={16} /></button>}
                  {st === "published" && <a href={`/blog/${p.slug}`} target="_blank" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Lihat artikel"><Eye size={16} /></a>}
                  <Link href={`/admin/blog/${p.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil size={16} /></Link>
                  <button onClick={() => remove(p)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Hapus"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
          {data && data.total === 0 && <p className="py-14 text-center text-sm text-slate-500">Belum ada artikel. <Link href="/admin/blog/new" className="font-semibold text-brand-600">Tulis artikel pertama</Link>.</p>}
        </div>
        {data && <Pager page={data.current_page} last={data.last_page} total={data.total} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
      </Panel>
    </div>
  );
}
