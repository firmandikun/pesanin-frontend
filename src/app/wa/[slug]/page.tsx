"use client";
import { MessageCircle } from "lucide-react";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader } from "@/components/kit/Loader";

type R = { available: boolean; url: string | null; delay: number; texts: { redirect: string; unavailable: string; button: string }; loading: { color: string; type: string } };

export default function RotatorRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [r, setR] = useState<R | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let visitor = "";
    try { visitor = localStorage.getItem("fk_vid") ?? Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("fk_vid", visitor); } catch {}
    api<R>(`/public/wa/${slug}?${new URLSearchParams({ visitor, ...Object.fromEntries(new URLSearchParams(location.search)) })}`).then((x) => {
      setR(x);
      if (x.available && x.url) setTimeout(() => { location.href = x.url!; }, Math.max(800, x.delay * 1000));
    }).catch(() => setMissing(true));
  }, [slug]);
  if (missing) return <div className="flex min-h-screen items-center justify-center text-slate-500">Link tidak ditemukan.</div>;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white p-6 text-center">
      {r ? <Loader type={r.loading.type} color={r.loading.color} size={56} /> : <Loader type="spinner" color="#e53935" size={56} />}
      <p className="max-w-sm text-slate-700">{r ? (r.available ? r.texts.redirect : r.texts.unavailable) : "Memuat…"}</p>
      {r?.url && <a href={r.url} className="flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white"><MessageCircle size={20} />{r.texts.button}</a>}
    </div>
  );
}
