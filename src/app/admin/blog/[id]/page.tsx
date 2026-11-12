"use client";

import { ArrowLeft, Bold, Eye, Heading2, Heading3, ImagePlus, Link2, List, Loader2, Quote, Save, Send, Trash2, Upload } from "lucide-react";
import { askConfirm } from "@/components/Dialogs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { FieldLabel, Panel, Toggle } from "@/components/kit";
import { ArticleBody } from "@/components/marketing/ArticleBody";
import { api, API_URL, ApiError, getToken, isoDate } from "@/lib/api";

type Post = { id?: number; title: string; slug: string; category: string; excerpt: string; body: string; cover_url: string; is_published: boolean; published_at: string | null };
const EMPTY: Post = { title: "", slug: "", category: "", excerpt: "", body: "", cover_url: "", is_published: false, published_at: isoDate(new Date()) };

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/admin/uploads`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "Upload gagal");
  return json.url;
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 150);

/** Console → Blog → editor: write, format, preview, and publish one article. */
export default function BlogEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(isNew ? EMPTY : null);
  const [cats, setCats] = useState<string[]>([]);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "cover" | "image">("");
  const area = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Record<string, number>>("/admin/blog-categories").then((c) => setCats(Object.keys(c)));
    if (!isNew) api<Post & { cover_url: string | null }>(`/admin/content/blog-posts/${id}`).then((p) => setPost({ ...p, cover_url: p.cover_url ?? "", published_at: p.published_at?.slice(0, 10) ?? null }));
  }, [id, isNew]);

  if (!post) return <p className="py-24 text-center text-slate-400">Memuat artikel…</p>;
  const set = <K extends keyof Post>(k: K, v: Post[K]) => setPost((p) => (p ? { ...p, [k]: v } : p));
  const words = post.body.split(/\s+/).filter(Boolean).length;

  /** Wrap the selection, or prefix the current line(s), in the body textarea. */
  const format = (kind: "h2" | "h3" | "list" | "quote" | "bold" | "link") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b);
    let next: string; let cursor: number;
    if (kind === "bold" || kind === "link") {
      const wrapped = kind === "bold" ? `**${sel || "teks tebal"}**` : `[${sel || "teks link"}](https://)`;
      next = value.slice(0, a) + wrapped + value.slice(b);
      cursor = a + wrapped.length;
    } else {
      const prefix = { h2: "## ", h3: "### ", list: "- ", quote: "> " }[kind];
      const lineStart = value.lastIndexOf("\n", a - 1) + 1;
      const block = value.slice(lineStart, b).split("\n").map((l) => prefix + l.replace(/^(#{2,3} |- |> )/, "")).join("\n");
      next = value.slice(0, lineStart) + block + value.slice(Math.max(b, lineStart));
      cursor = lineStart + block.length;
    }
    set("body", next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  };

  const insertImage = async (file?: File) => {
    if (!file) return;
    setBusy("image");
    try {
      const url = await uploadImage(file);
      const el = area.current;
      const pos = el ? el.selectionEnd : post.body.length;
      const line = `\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`;
      set("body", post.body.slice(0, pos) + line + post.body.slice(pos));
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(""); if (imageInput.current) imageInput.current.value = ""; }
  };

  const save = async (publish?: boolean) => {
    setBusy("save"); setMsg(null);
    const body = { ...post, is_published: publish ?? post.is_published, slug: post.slug || null, cover_url: post.cover_url || null };
    delete body.id;
    try {
      const saved = await api<Post & { id: number }>(isNew ? "/admin/content/blog-posts" : `/admin/content/blog-posts/${id}`, { method: isNew ? "POST" : "PUT", json: body });
      setMsg({ ok: true, text: body.is_published ? "Artikel tersimpan dan tayang." : "Draf tersimpan." });
      if (isNew) router.replace(`/admin/blog/${saved.id}`);
      else setPost({ ...post, is_published: body.is_published, slug: saved.slug });
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setBusy(""); }
  };

  const remove = async () => {
    if (!(await askConfirm("Hapus artikel ini? Artikel hilang dari blog dan tidak bisa dikembalikan.", { title: "Hapus artikel?" }))) return;
    await api(`/admin/content/blog-posts/${id}`, { method: "DELETE" });
    router.replace("/admin/blog");
  };

  const scheduled = post.is_published && post.published_at && post.published_at > isoDate(new Date());
  const tool = "flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/blog" className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16} />Semua artikel</Link>
        <div className="flex flex-wrap gap-2">
          {!isNew && post.is_published && !scheduled && <a href={`/blog/${post.slug}`} target="_blank" className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"><Eye size={16} />Lihat</a>}
          <button disabled={!!busy} onClick={() => save(false)} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><Save size={16} />Simpan draf</button>
          <button disabled={!!busy} onClick={() => save(true)} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{scheduled ? "Jadwalkan" : post.is_published ? "Perbarui" : "Terbitkan"}</button>
        </div>
      </div>
      {msg && <p className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Panel className="overflow-hidden">
          <input className="w-full border-b border-slate-100 px-6 py-5 text-2xl font-extrabold text-slate-900 outline-none placeholder:text-slate-300" placeholder="Judul artikel"
            value={post.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-3 py-2">
            <div className="mr-2 flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
              {(["write", "preview"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`h-7 rounded-md px-3 text-xs font-semibold ${tab === t ? "bg-slate-900 text-white" : "text-slate-600"}`}>{t === "write" ? "Tulis" : "Pratinjau"}</button>)}
            </div>
            {tab === "write" && <>
              <button onClick={() => format("h2")} className={tool} title="Subjudul"><Heading2 size={15} /></button>
              <button onClick={() => format("h3")} className={tool} title="Sub-subjudul"><Heading3 size={15} /></button>
              <button onClick={() => format("list")} className={tool} title="Poin"><List size={15} /></button>
              <button onClick={() => format("quote")} className={tool} title="Kutipan"><Quote size={15} /></button>
              <button onClick={() => format("bold")} className={tool} title="Tebal"><Bold size={15} /></button>
              <button onClick={() => format("link")} className={tool} title="Link"><Link2 size={15} /></button>
              <button onClick={() => imageInput.current?.click()} className={tool} title="Sisipkan gambar">{busy === "image" ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}Gambar</button>
              <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => insertImage(e.target.files?.[0])} />
            </>}
            <span className="ml-auto text-xs text-slate-400">{words.toLocaleString("id-ID")} kata · ±{Math.max(1, Math.ceil(words / 200))} menit baca</span>
          </div>
          {tab === "write"
            ? <textarea ref={area} className="min-h-[560px] w-full resize-y px-6 py-5 font-mono text-[15px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-300"
                placeholder={"Tulis paragraf di sini. Satu paragraf per baris.\n\n## Subjudul\n- Poin penting\n> Kutipan\n**teks tebal** dan [link](https://…)"}
                value={post.body} onChange={(e) => set("body", e.target.value)} />
            : <div className="min-h-[560px] px-6 py-6 md:px-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {post.cover_url && <img src={post.cover_url} alt="" className="mb-6 w-full rounded-2xl object-cover" />}
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{post.category || "Kategori"}</p>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{post.title || "Judul artikel"}</h1>
                <div className="mt-6">{post.body.trim() ? <ArticleBody lines={post.body.split("\n")} /> : <p className="text-slate-400">Belum ada isi.</p>}</div>
              </div>}
        </Panel>

        <div className="space-y-4">
          <Panel className="space-y-4 p-5">
            <label className="flex items-center justify-between text-sm"><span><b className="block text-slate-900">Tayangkan</b><span className="text-xs text-slate-500">{post.is_published ? (scheduled ? "Terjadwal tayang otomatis" : "Tampil di /blog") : "Masih draf, tidak tampil"}</span></span><Toggle checked={post.is_published} onChange={(v) => set("is_published", v)} /></label>
            <div><FieldLabel>Tanggal terbit</FieldLabel><DatePicker value={post.published_at} onChange={(v) => set("published_at", v)} /><p className="mt-1 text-xs text-slate-500">Tanggal di masa depan = artikel terjadwal.</p></div>
          </Panel>

          <Panel className="space-y-3 p-5">
            <b className="text-sm text-slate-900">Cover</b>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {post.cover_url ? <div className="relative"><img src={post.cover_url} alt="" className="aspect-[1.91/1] w-full rounded-xl object-cover" /><button onClick={() => set("cover_url", "")} className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-rose-600 shadow" aria-label="Hapus cover"><Trash2 size={14} /></button></div>
              : <label className="flex aspect-[1.91/1] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600">
                  {busy === "cover" ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}Upload gambar (1200×630)
                  <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy("cover"); try { set("cover_url", await uploadImage(f)); } catch (err) { setMsg({ ok: false, text: (err as Error).message }); } finally { setBusy(""); } }} />
                </label>}
          </Panel>

          <Panel className="space-y-4 p-5">
            <div>
              <FieldLabel>Kategori</FieldLabel>
              <input list="blog-cats" className="input" placeholder="mis. Marketplace" value={post.category} onChange={(e) => set("category", e.target.value)} />
              <datalist id="blog-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
              <div className="mt-2 flex flex-wrap gap-1">{cats.map((c) => <button key={c} onClick={() => set("category", c)} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${post.category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>{c}</button>)}</div>
            </div>
            <div><FieldLabel>Ringkasan</FieldLabel><textarea rows={3} maxLength={300} className="input" placeholder="Tampil di daftar blog dan hasil Google" value={post.excerpt} onChange={(e) => set("excerpt", e.target.value)} /><p className="mt-1 text-right text-xs text-slate-400">{post.excerpt.length}/300</p></div>
            <div><FieldLabel>Slug URL</FieldLabel><div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 pl-3 text-xs text-slate-500">/blog/<input className="h-10 flex-1 rounded-r-lg border-0 bg-white px-2 text-sm text-slate-800 outline-none" value={post.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} /></div></div>
          </Panel>

          <Panel className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pratinjau Google</p>
            <p className="truncate text-xs text-slate-500">pesaninn.my.id › blog › {post.slug || "slug-artikel"}</p>
            <p className="truncate text-lg text-[#1a0dab]">{post.title || "Judul artikel"} · Blog Pesanin</p>
            <p className="line-clamp-2 text-sm text-slate-600">{post.excerpt || "Ringkasan artikel akan tampil di sini."}</p>
          </Panel>

          {!isNew && <button onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={15} />Hapus artikel</button>}
        </div>
      </div>
    </div>
  );
}
