"use client";

import { ExternalLink, Eye, EyeOff, Pencil, PlayCircle, Plus, Search, Trash2 } from "lucide-react";
import { askConfirm } from "@/components/Dialogs";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { Dialog, DialogActions, FieldLabel, Pager, Panel, Toggle } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, isoDate, Paginated } from "@/lib/api";
import { TUTORIAL_CATEGORIES, youtubeId } from "@/lib/content";

type Row = Record<string, any> & { id: number; title: string; is_published: boolean };
const META = {
  tutorials: { title: "Tutorial", desc: "Video & panduan di halaman /tutorials dan menu Tutorial di aplikasi.", publicUrl: "/tutorials" },
  "blog-posts": { title: "Blog", desc: "Artikel di halaman /blog.", publicUrl: "/blog" },
  announcements: { title: "Pengumuman", desc: "Update fitur yang tampil di panel “Info Terbaru” dalam aplikasi seller.", publicUrl: null },
} as const;
type Type = keyof typeof META;

const blank = (type: Type): Row => type === "tutorials"
  ? { id: 0, title: "", category: "pemula", description: "", video_url: "", duration: "", steps: [""], is_published: true, sort: 0 }
  : type === "blog-posts"
    ? { id: 0, title: "", category: "Marketplace", excerpt: "", body: "", cover_url: "", is_published: true, published_at: isoDate(new Date()) }
    : { id: 0, tag: "NEW", title: "", body: "", is_published: true, published_at: isoDate(new Date()) };

export default function ContentAdmin() {
  const { type } = useParams<{ type: string }>();
  const valid = type in META;
  const t = (valid ? type : "tutorials") as Type;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Row> & { total: number } | null>(null);
  const [form, setForm] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(search ? { search } : {}) });
    api<Paginated<Row> & { total: number }>(`/admin/content/${t}?${q}`).then(setData);
  }, [t, page, perPage, search]);
  useEffect(() => { if (!valid) return; const x = setTimeout(load, 200); return () => clearTimeout(x); }, [load, valid]);
  if (!valid) notFound();

  const set = (k: string, v: unknown) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setError("");
    const { id, created_at, updated_at, views, ...body } = form;
    for (const k of ["video_url", "duration", "cover_url", "slug"]) if (body[k] === "") body[k] = null;
    try {
      await api(id ? `/admin/content/${t}/${id}` : `/admin/content/${t}`, { method: id ? "PUT" : "POST", json: body });
      setForm(null); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal menyimpan"); }
    finally { setSaving(false); }
  };
  const togglePublish = async (r: Row) => {
    const { id, created_at, updated_at, views, ...body } = r;
    await api(`/admin/content/${t}/${id}`, { method: "PUT", json: { ...body, is_published: !r.is_published, published_at: body.published_at?.slice?.(0, 10) ?? body.published_at } });
    load();
  };
  const remove = async (r: Row) => { if (await askConfirm(`Hapus "${r.title}"? Tidak bisa dikembalikan.`)) { await api(`/admin/content/${t}/${r.id}`, { method: "DELETE" }); load(); } };
  const m = META[t];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-navy">{m.title}</h1><p className="text-sm text-slate-500">{m.desc}</p></div>
        <div className="flex gap-2">
          {m.publicUrl && <a href={m.publicUrl} target="_blank" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy"><ExternalLink size={15} />Lihat halaman</a>}
          <button onClick={() => setForm(blank(t))} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"><Plus size={16} />Tambah {m.title.toLowerCase()}</button>
        </div>
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 p-4"><div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari judul" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div></div>
        <div className="divide-y divide-slate-100">
          {(data?.data ?? []).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              {t === "tutorials" && (youtubeId(r.video_url)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={`https://img.youtube.com/vi/${youtubeId(r.video_url)}/mqdefault.jpg`} alt="" className="h-14 w-24 rounded-lg object-cover" />
                : <span className="flex h-14 w-24 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-semibold text-brand-600">Panduan tertulis</span>)}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy">{t === "announcements" && <span className="mr-2 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{r.tag}</span>}{r.title}</p>
                <p className="truncate text-sm text-slate-500">{r.description ?? r.excerpt ?? r.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t === "tutorials" ? <>{TUTORIAL_CATEGORIES[r.category as keyof typeof TUTORIAL_CATEGORIES]} · urutan {r.sort}{r.duration ? ` · ${r.duration}` : ""} · {r.views} dilihat</> : <>{r.category ? `${r.category} · ` : ""}{r.published_at ? new Date(r.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}{r.views != null ? ` · ${r.views} dilihat` : ""}</>}
                </p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${r.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{r.is_published ? "Tayang" : "Draf"}</span>
              <div className="flex">
                <button onClick={() => togglePublish(r)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title={r.is_published ? "Jadikan draf" : "Tayangkan"}>{r.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button onClick={() => setForm({ ...r, steps: r.steps?.length ? r.steps : [""], published_at: r.published_at?.slice(0, 10) ?? null })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Ubah"><Pencil size={16} /></button>
                <button onClick={() => remove(r)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label="Hapus"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {data && data.total === 0 && <p className="py-14 text-center text-sm text-slate-500">Belum ada konten.</p>}
        </div>
        {data && <Pager page={data.current_page} last={data.last_page} total={data.total} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
      </Panel>

      {form && (
        <Dialog title={`${form.id ? "Ubah" : "Tambah"} ${m.title.toLowerCase()}`} onClose={() => setForm(null)} width="max-w-2xl">
          <form onSubmit={save} className="space-y-4">
            {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
            {t === "announcements" && <div><FieldLabel>Label</FieldLabel><Select className="input" value={form.tag} onChange={(e) => set("tag", e.target.value)}><option value="NEW">NEW</option><option value="UPDATE">UPDATE</option><option value="INFO">INFO</option></Select></div>}
            <div><FieldLabel>Judul</FieldLabel><input required className="input" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            {t === "tutorials" && <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><FieldLabel>Kategori</FieldLabel><Select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>{Object.entries(TUTORIAL_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
                <div><FieldLabel>Durasi (mm:ss)</FieldLabel><input className="input" placeholder="5:28" value={form.duration ?? ""} onChange={(e) => set("duration", e.target.value)} /></div>
                <div><FieldLabel>Urutan</FieldLabel><input type="number" min={0} className="input" value={form.sort ?? 0} onChange={(e) => set("sort", Number(e.target.value))} /></div>
              </div>
              <div><FieldLabel>Deskripsi singkat</FieldLabel><textarea required rows={2} maxLength={300} className="input" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <div><FieldLabel>Link video YouTube (opsional)</FieldLabel><input className="input" placeholder="https://www.youtube.com/watch?v=…" value={form.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} />
                {youtubeId(form.video_url) && <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><PlayCircle size={13} />Video terdeteksi: {youtubeId(form.video_url)}</p>}</div>
              <div>
                <FieldLabel>Langkah-langkah</FieldLabel>
                <div className="space-y-2">{(form.steps as string[]).map((s, i) => (
                  <div key={i} className="flex gap-2"><span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
                    <input className="input" value={s} onChange={(e) => set("steps", (form.steps as string[]).map((x, j) => (j === i ? e.target.value : x)))} />
                    <button type="button" onClick={() => set("steps", (form.steps as string[]).filter((_, j) => j !== i))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Hapus langkah"><Trash2 size={15} /></button></div>
                ))}</div>
                <button type="button" onClick={() => set("steps", [...(form.steps as string[]), ""])} className="mt-2 text-sm font-semibold text-brand-600">+ Tambah langkah</button>
              </div>
            </>}
            {t === "blog-posts" && <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><FieldLabel>Kategori</FieldLabel><input required className="input" value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
                <div><FieldLabel>Tanggal terbit</FieldLabel><DatePicker value={form.published_at} onChange={(v) => set("published_at", v)} /></div>
              </div>
              <div><FieldLabel>Ringkasan</FieldLabel><textarea required rows={2} maxLength={300} className="input" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></div>
              <div><FieldLabel>Isi artikel</FieldLabel><textarea required rows={12} className="input font-mono text-sm" value={form.body} onChange={(e) => set("body", e.target.value)} />
                <p className="mt-1 text-xs text-slate-500">Satu paragraf per baris. Awali dengan <code>## </code> untuk subjudul dan <code>- </code> untuk poin.</p></div>
            </>}
            {t === "announcements" && <>
              <div><FieldLabel>Isi</FieldLabel><textarea required rows={4} maxLength={2000} className="input" value={form.body} onChange={(e) => set("body", e.target.value)} /></div>
              <div><FieldLabel>Tanggal tayang</FieldLabel><DatePicker value={form.published_at} onChange={(v) => set("published_at", v)} /></div>
            </>}
            <label className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"><span className="font-medium text-navy">Tayangkan</span><Toggle checked={!!form.is_published} onChange={(v) => set("is_published", v)} /></label>
            <DialogActions onCancel={() => setForm(null)} saving={saving} />
          </form>
        </Dialog>
      )}
    </div>
  );
}
