"use client";
import { Search, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type Announcement, publicApi } from "@/lib/content";

type Post = { date: string; tag: string; title: string; body: string; color: string };
const TAG_COLOR: Record<string, string> = { NEW: "bg-emerald-600", UPDATE: "bg-brand-600", INFO: "bg-navy" };

export function WhatsNew({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    publicApi<{ data: Announcement[] }>("/announcements")
      .then((r) => setPosts(r.data.map((a) => ({ date: new Date(a.published_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }), tag: a.tag, title: a.title, body: a.body, color: TAG_COLOR[a.tag] ?? "bg-navy" }))))
      .catch(() => setPosts([]));
  }, []);
  const list = (posts ?? []).filter((p) => (p.title + p.body).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30" />
      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[400px] flex-col bg-slate-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-16 items-center gap-3 bg-[#3dbf9a] px-4 text-white">
          {searching ? <input autoFocus className="h-9 flex-1 rounded bg-white/20 px-3 text-sm placeholder:text-white/80 outline-none" placeholder="Cari update…" value={q} onChange={(e) => setQ(e.target.value)} />
            : <span className="flex-1 text-lg font-medium">What&apos;s new on Pesanin</span>}
          <button onClick={() => setSearching(!searching)} aria-label="Cari"><Search size={18} /></button>
          <button onClick={onClose} aria-label="Tutup"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {list.map((p) => (
            <article key={p.title} className="rounded-md bg-white p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-400"><span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{p.tag}</span>{p.date}<Share2 size={13} className="ml-auto" /></div>
              <h3 className="mb-3 font-semibold text-slate-800">{p.title}</h3>
              <div className={`mb-3 flex h-36 items-center justify-center rounded ${p.color} px-6 text-center text-xl font-extrabold text-white`}>{p.title}</div>
              <p className="text-sm text-slate-700">{p.body}</p>
            </article>
          ))}
          {posts === null && <p className="p-6 text-center text-sm text-slate-400">Memuat…</p>}
          {posts !== null && !list.length && <p className="p-6 text-center text-sm text-slate-500">Tidak ada update yang cocok.</p>}
        </div>
      </aside>
    </div>
  );
}
