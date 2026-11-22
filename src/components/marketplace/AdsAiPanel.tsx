"use client";
import { ArrowRight, Bot, Check, ChevronDown, Lightbulb, Loader2, Settings, Shuffle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { askConfirm, showAlert } from "@/components/Dialogs";
import { Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Decision = "pause" | "raise_target" | "lower_target" | "scale" | "fix_creative" | "fix_offer" | "keep" | "wait";
type Camp = {
  id: number; name: string; shop: string; decision: Decision; target_roas: number | null; headline: string; reason: string; steps: string[];
  apply: { action: "pause" | "change_roas_target"; target?: number } | null;
  metrics: { spend_incl_ppn: number; ad_sales: number; orders: number; roas_real: number | null; break_even_roas: number | null; profit_after_hpp_fees: number | null; ctr_pct: number | null; cr_pct: number | null; roas_target_now: number | null };
};
type Analysis = {
  score: number; label: string; summary: string; custom_answer?: string | null;
  budget_plan: { summary: string; moves: { from: string | null; to: string | null; amount: string; reason: string }[] } | null;
  campaigns: Camp[];
  insights: { title: string; detail: string; action?: string }[];
  action_plan: { day: string; task: string }[];
  totals: { running_ads: number; spend_incl_ppn: number; ad_sales: number; ad_orders: number; roas_real: number | null; profit_after_hpp_fees: number; ads_share_of_sales_pct: number | null; losing: number; no_sales: number };
  period: { from: string; to: string };
  model?: string; generated_at?: string;
};

const DECISION: Record<Decision, { label: string; cls: string }> = {
  pause: { label: "Jeda iklan", cls: "bg-rose-100 text-rose-700" },
  raise_target: { label: "Naikkan target ROAS", cls: "bg-amber-100 text-amber-700" },
  lower_target: { label: "Turunkan target ROAS", cls: "bg-sky-100 text-sky-700" },
  scale: { label: "Scale-up", cls: "bg-emerald-100 text-emerald-700" },
  fix_creative: { label: "Perbaiki foto/judul", cls: "bg-violet-100 text-violet-700" },
  fix_offer: { label: "Perbaiki harga/penawaran", cls: "bg-violet-100 text-violet-700" },
  keep: { label: "Pertahankan", cls: "bg-slate-100 text-slate-700" },
  wait: { label: "Tunggu data", cls: "bg-slate-100 text-slate-500" },
};
const QUESTIONS = ["Iklan mana yang paling boros?", "Berapa budget ideal per hari?", "Kenapa ROAS saya turun minggu ini?"];

/**
 * Iklan Shopee → Analisa AI Iklan: Gemini (seller's own key) reads every running ad (real ROAS vs break-even, CTR, CR,
 * 7-day trend, profit after HPP) and gives one decision per ad, a budget shift plan and account-level fixes.
 * Pause / ROAS-target decisions can be applied in Shopee straight from here (after a confirmation).
 */
export function AdsAiPanel({ shopId, range, onApplied }: { shopId?: string; range: { from: string; to: string }; onApplied?: () => void }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [a, setA] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [applied, setApplied] = useState<Record<number, string>>({});
  const qs = new URLSearchParams({ ...range, ...(shopId ? { shop_id: shopId } : {}) }).toString();

  type State = { gemini_connected: boolean; analysis: Analysis | null; job: { status: "running" | "done" | "failed"; error?: string } | null };
  const poll = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const started = useRef(false);

  // The analysis runs in the background on the server (Gemini takes 20–90 s): poll until it is done.
  const load = useCallback(() => {
    clearTimeout(poll.current);
    api<State>(`/marketplace/ads/ai?${qs}`).then((r) => {
      setConnected(r.gemini_connected);
      if (r.job?.status === "running") { setBusy(true); poll.current = setTimeout(load, 4000); return; }
      setBusy(false);
      if (r.job?.status === "failed" && started.current) showAlert(r.job.error || "Analisa AI gagal", "Gagal");
      started.current = false;
      setA(r.analysis); setApplied({});
    }).catch(() => { setBusy(false); setConnected((c) => c ?? false); });
  }, [qs]);
  useEffect(() => { load(); return () => clearTimeout(poll.current); }, [load]);

  const run = async (q?: string) => {
    const ask = (q ?? question).trim();
    if (q !== undefined) setQuestion(q);
    setBusy(true); setOpen(true);
    try {
      await api(`/marketplace/ads/ai?${qs}`, { method: "POST", json: { question: ask || null } });
      started.current = true;
      poll.current = setTimeout(load, 4000);
    } catch (e) {
      setBusy(false);
      showAlert(e instanceof ApiError ? e.message : "Analisa AI gagal", "Gagal");
    }
  };

  const apply = async (c: Camp) => {
    if (!c.apply) return;
    const what = c.apply.action === "pause" ? `Jeda iklan "${c.name}" di Shopee?` : `Ubah target ROAS "${c.name}" dari ${c.metrics.roas_target_now ?? "-"} ke ${c.apply.target} di Shopee?`;
    if (!(await askConfirm(what, { title: "Terapkan saran AI", confirmLabel: "Terapkan", danger: c.apply.action === "pause" }))) return;
    try {
      await api(`/marketplace/ads/guard/${c.id}`, { method: "POST", json: c.apply });
      setApplied((x) => ({ ...x, [c.id]: c.apply!.action === "pause" ? "Dijeda" : `Target → ${c.apply!.target}` }));
      onApplied?.();
    } catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal mengubah iklan", "Gagal"); }
  };

  const t = a?.totals;
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-navy">Analisa AI Iklan</p>
          <p className="text-xs text-slate-500">Keputusan per iklan, rencana pindah budget, dan perbaikan akun iklan. Data dibaca sesuai periode{shopId ? " & toko" : ""} yang dipilih: <b className="text-slate-700">{range.from} s/d {range.to}</b>.</p>
        </div>
        {connected === false ? (
          <Link href="/settings/integrations" className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white"><Settings size={14} />Hubungkan Gemini</Link>
        ) : (
          <button onClick={() => run()} disabled={busy || !connected} className="flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}{a ? "Analisa ulang" : "Analisa dengan AI"}
          </button>
        )}
        {a && <button onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={open ? "Tutup" : "Buka"}><ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} /></button>}
      </div>

      {connected && (
        <div className="space-y-2 border-b border-slate-100 px-5 py-3">
          <div className="flex gap-2">
            <input className="input h-9 flex-1 text-sm" maxLength={500} placeholder="Tanya soal iklan (opsional), mis. iklan mana yang harus dimatikan?" value={question}
              onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && run()} />
          </div>
          <div className="flex flex-wrap gap-1.5">{QUESTIONS.map((q) => <button key={q} onClick={() => run(q)} disabled={busy} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50">{q}</button>)}</div>
        </div>
      )}

      {busy && <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin text-violet-600" />AI membaca semua iklan, ROAS vs titik impas, CTR, CR, dan tren 7 hari… (model Pro: 1–3 menit, halaman boleh ditinggal)</p>}

      {!busy && a && open && (
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-bold ${a.score >= 75 ? "border-emerald-300 bg-emerald-50 text-emerald-700" : a.score >= 50 ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>
              <span className="text-xl leading-none">{a.score}</span><span className="text-[9px]">/100</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-navy">Kesehatan iklan: {a.label}</p>
              <p className="mt-0.5 text-sm text-slate-600">{a.summary}</p>
              <p className="mt-1 text-[11px] text-slate-400">{a.period.from} s/d {a.period.to}{a.model ? ` · ${a.model}` : ""}{a.generated_at ? ` · ${new Date(a.generated_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</p>
            </div>
          </div>

          {t && (
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
              {[["Biaya iklan (+PPN)", rupiah(t.spend_incl_ppn)], ["Penjualan iklan", rupiah(t.ad_sales)], ["ROAS riil", t.roas_real ? `${t.roas_real}x` : "-"],
                ["Laba/rugi iklan", rupiah(t.profit_after_hpp_fees)], ["Porsi penjualan dari iklan", t.ads_share_of_sales_pct !== null ? `${t.ads_share_of_sales_pct}%` : "-"]].map(([l, v], i) => (
                <div key={l} className="rounded-lg bg-slate-50 p-2.5"><p className="text-slate-500">{l}</p><p className={`mt-0.5 text-sm font-bold ${i === 3 && t.profit_after_hpp_fees < 0 ? "text-rose-600" : "text-navy"}`}>{v}</p></div>
              ))}
            </div>
          )}

          {a.custom_answer && <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-sm text-indigo-950"><b className="block text-[11px] uppercase tracking-wide text-indigo-700">Jawaban pertanyaan Anda</b><p className="mt-1 whitespace-pre-line">{a.custom_answer}</p></div>}

          {a.budget_plan && (a.budget_plan.summary || a.budget_plan.moves.length > 0) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Shuffle size={15} />Rencana pindah budget</p>
              {a.budget_plan.summary && <p className="mt-1 text-xs text-emerald-900">{a.budget_plan.summary}</p>}
              {a.budget_plan.moves.map((m, i) => (
                <div key={i} className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-white px-2 py-1 font-semibold text-rose-700 ring-1 ring-rose-100">{m.from ?? "—"}</span><ArrowRight size={13} className="text-slate-400" />
                  <span className="rounded bg-white px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-100">{m.to ?? "—"}</span>
                  <b className="text-navy">{m.amount}</b><span className="text-slate-500">{m.reason}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-bold text-navy">Keputusan per iklan ({a.campaigns.length})</p>
            {a.campaigns.map((c) => {
              const m = c.metrics;
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.shop} · Biaya {rupiah(m.spend_incl_ppn)} · ROAS riil {m.roas_real ?? "-"}x vs impas {m.break_even_roas ?? "-"}x · {m.orders} pesanan{m.ctr_pct !== null ? ` · CTR ${m.ctr_pct}%` : ""}{m.cr_pct !== null ? ` · CR ${m.cr_pct}%` : ""}{m.profit_after_hpp_fees !== null ? ` · ${m.profit_after_hpp_fees < 0 ? "rugi" : "laba"} ${rupiah(Math.abs(m.profit_after_hpp_fees))}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${DECISION[c.decision].cls}`}>{DECISION[c.decision].label}{c.target_roas ? ` → ${c.target_roas}` : ""}</span>
                      {applied[c.id] ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} />{applied[c.id]}</span>
                        : c.apply && <button onClick={() => apply(c)} className="h-8 rounded-lg bg-navy px-3 text-xs font-semibold text-white hover:bg-slate-800">Terapkan</button>}
                    </div>
                  </div>
                  {c.headline && <p className="mt-1.5 text-xs font-semibold text-slate-800">{c.headline}</p>}
                  {c.reason && <p className="mt-0.5 text-xs text-slate-600">{c.reason}</p>}
                  {c.steps.length > 0 && <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-slate-600">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                </div>
              );
            })}
          </div>

          {(a.insights.length > 0 || a.action_plan.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {a.insights.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-navy"><Lightbulb size={15} className="text-amber-500" />Perbaikan akun iklan</p>
                  {a.insights.map((x, i) => <div key={i} className="rounded-lg bg-amber-50/60 p-3 text-xs"><b className="text-slate-800">{x.title}</b><p className="mt-0.5 text-slate-600">{x.detail}</p>{x.action && <p className="mt-0.5 font-semibold text-amber-800">{x.action}</p>}</div>)}
                </div>
              )}
              {a.action_plan.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-navy">Rencana 7 hari</p>
                  {a.action_plan.map((s, i) => <div key={i} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><b className="shrink-0 text-violet-700">{s.day}</b><span className="text-slate-700">{s.task}</span></div>)}
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-slate-400">Saran AI berdasarkan data periode terpilih. &quot;Terapkan&quot; mengubah iklan langsung di Shopee setelah konfirmasi.</p>
        </div>
      )}

      {!busy && !a && connected && <p className="px-5 py-6 text-center text-xs text-slate-500">Klik <b>Analisa dengan AI</b> untuk keputusan tiap iklan: jeda, naikkan target ROAS, scale-up, atau perbaiki foto/harga.</p>}
      {connected === false && <p className="px-5 py-4 text-xs text-slate-500">Masukkan API Key Gemini (gratis dari Google AI Studio) di Pengaturan → Integrasi untuk memakai Analisa AI Iklan.</p>}
    </Panel>
  );
}
