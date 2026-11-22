"use client";
import {
  AlertTriangle, ArrowRight, Bot, CheckCircle2, Flame, Gauge, Loader2, Megaphone, Settings, ShieldAlert, Sparkles,
  TrendingDown, TrendingUp, Wallet, Wrench, Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "@/components/DateRange";
import { showAlert } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type Financials = {
  revenue: number; cogs: number; platform_fees: number; ad_spend: number; expenses: number; net_profit: number; net_margin_pct: number;
  orders_count: number; cancelled_orders: number; returns_count: number; ad_waste_estimate: number; warehouse_modal: number; missing_hpp_count: number;
};
type Snapshot = {
  period: { from: string; to: string };
  financials: Financials;
  loss_products: unknown[];
  previous_period?: { from: string; to: string; revenue: number; net_profit: number; net_margin_pct: number; orders_count: number; ad_spend: number };
  money_check?: { total_at_stake: number; kinds: { kind: string; orders: number; amount: number }[] };
  margin_check?: { rugi: number; tipis: number; checked: number };
  ship_deadline?: { late_now: number; due_within_6h: number; due_within_24h: number };
  stock_forecast?: { habis: number; kritis: number; segera: number; mati: number; dead_value: number };
  reviews?: { average: number; low_1_3: number; unreplied_low: number };
  cod?: { rts_rate_pct: number; returned_rts: number };
};
type Linkable = { link?: string | null };
type Diagnosis = {
  health_score: number;
  health_label: string;
  executive_summary: string;
  trend?: { direction: string; summary: string } | null;
  custom_answer?: string | null;
  quick_wins?: ({ title: string; impact: string; action: string } & Linkable)[];
  shops_audit?: ({ shop_name: string; status: string; summary: string; action: string } & Linkable)[];
  ads_audit?: { shop_name: string; campaign_name: string; verdict: string; metrics: string; action: string }[];
  financial_leaks?: ({ title: string; severity: "high" | "medium" | "low"; estimated_impact: string; detail: string; action: string } & Linkable)[];
  loss_products_advice?: ({ product_name: string; issue: string; action: string } & Linkable)[];
  best_products_advice?: ({ product_name: string; insight: string; action: string } & Linkable)[];
  operations?: ({ area: string; finding: string; action: string } & Linkable)[];
  action_plan_7_days?: (string | ({ day: string; task: string } & Linkable))[];
  model?: string;
  generated_at?: string;
};
type History = { score: number; label: string | null; at: string; from: string; to: string; net_profit: number }[];

const wibDate = (offsetDays = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + offsetDays * 864e5));
const SEVERITY: Record<string, { cls: string; label: string }> = {
  high: { cls: "bg-rose-50 text-rose-700 ring-rose-200", label: "Prioritas Tinggi" },
  medium: { cls: "bg-amber-50 text-amber-700 ring-amber-200", label: "Sedang" },
  low: { cls: "bg-sky-50 text-sky-700 ring-sky-200", label: "Rendah" },
};
const QUESTIONS = [
  "Kenapa laba saya turun dibanding periode lalu?",
  "Iklan mana yang harus dimatikan dulu?",
  "Produk mana yang harganya harus dinaikkan dan berapa?",
  "Berapa uang yang bisa saya klaim ke Shopee?",
];
const STEPS = ["Membaca laba rugi & tren", "Mengecek produk rugi & margin", "Mengaudit iklan Shopee", "Mencari dana yang bisa diklaim", "Menyusun rencana aksi"];

const tone = (s: string) => (/sehat|scale|aman/i.test(s) ? "bg-emerald-50 text-emerald-700" : /kritis|matikan|jeda|rugi/i.test(s) ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700");

function Go({ link }: { link?: string | null }) {
  if (!link) return null;
  return <Link href={link} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">Buka<ArrowRight size={12} /></Link>;
}

/** Change vs the previous period, as ▲ / ▼ percent. */
function Delta({ now, before, invert }: { now: number; before?: number; invert?: boolean }) {
  if (before === undefined || before === 0) return null;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  if (!isFinite(pct) || pct === 0) return <span className="text-[11px] text-slate-400">= periode lalu</span>;
  const good = invert ? pct < 0 : pct > 0;
  return <span className={`text-[11px] font-semibold ${good ? "text-emerald-600" : "text-rose-600"}`}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs periode lalu</span>;
}

function Section({ icon: Icon, color, title, children, extra }: { icon: typeof Bot; color: string; title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Icon size={16} className={color} />{title}</h3>
        {extra}
      </div>
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

export default function AiDiagnosisPage() {
  const [range, setRange] = useState({ from: wibDate(-29), to: wibDate(0) });
  const [question, setQuestion] = useState("");
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [history, setHistory] = useState<History>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setLoadErr("");
    api<{ gemini_connected: boolean; snapshot: Snapshot; diagnosis: Diagnosis | null; history?: History }>(`/reports/ai-diagnosis?${new URLSearchParams(range)}`)
      .then((r) => { setConnected(r.gemini_connected); setSnapshot(r.snapshot); setDiagnosis(r.diagnosis); setHistory(r.history ?? []); })
      .catch((e) => setLoadErr(e instanceof ApiError ? e.message : "Gagal memuat data diagnosa bisnis."))
      .finally(() => setLoading(false));
  }, [range]);
  useEffect(() => { load(); }, [load]);

  // Progress text while Gemini works (it takes 20–60 s).
  useEffect(() => {
    if (!analyzing) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 7000);
    return () => clearInterval(t);
  }, [analyzing]);

  const runDiagnosis = async (q?: string) => {
    const ask = (q ?? question).trim();
    if (q !== undefined) setQuestion(q);
    setAnalyzing(true);
    try {
      const r = await api<{ snapshot: Snapshot; diagnosis: Diagnosis; history: History }>("/reports/ai-diagnosis", { method: "POST", json: { ...range, question: ask || null } });
      setSnapshot(r.snapshot); setDiagnosis(r.diagnosis); setHistory(r.history ?? []);
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal menjalankan diagnosa AI", "Gagal");
    } finally { setAnalyzing(false); }
  };

  const f = snapshot?.financials;
  const prev = snapshot?.previous_period;
  // The diagnosis before the one shown: did the score go up?
  const shownIdx = diagnosis?.generated_at ? history.findIndex((h) => h.at === diagnosis.generated_at) : -1;
  const before = shownIdx > 0 ? history[shownIdx - 1] : null;
  const ops = snapshot ? [
    snapshot.money_check?.total_at_stake ? { label: `Dana bisa diklaim/dicek ${rupiah(snapshot.money_check.total_at_stake)}`, href: "/marketplace/money-check", bad: true } : null,
    snapshot.ship_deadline && (snapshot.ship_deadline.late_now || snapshot.ship_deadline.due_within_6h) ? { label: `${snapshot.ship_deadline.late_now} pesanan telat kirim · ${snapshot.ship_deadline.due_within_6h} < 6 jam`, href: "/marketplace/health", bad: true } : null,
    snapshot.margin_check && (snapshot.margin_check.rugi || snapshot.margin_check.tipis) ? { label: `${snapshot.margin_check.rugi} varian dijual rugi · ${snapshot.margin_check.tipis} margin tipis`, href: "/marketplace/margins", bad: true } : null,
    snapshot.stock_forecast && (snapshot.stock_forecast.habis + snapshot.stock_forecast.kritis) ? { label: `${snapshot.stock_forecast.habis + snapshot.stock_forecast.kritis} SKU perlu restock`, href: "/marketplace/stock?filter=restock", bad: true } : null,
    snapshot.reviews?.unreplied_low ? { label: `${snapshot.reviews.unreplied_low} ulasan buruk belum dibalas`, href: "/marketplace/reviews", bad: false } : null,
    snapshot.cod && snapshot.cod.returned_rts ? { label: `RTS COD ${snapshot.cod.rts_rate_pct}%`, href: "/orders", bad: snapshot.cod.rts_rate_pct > 10 } : null,
    f && f.missing_hpp_count > 0 ? { label: `${f.missing_hpp_count} produk belum ada HPP`, href: "/marketplace/products", bad: false } : null,
  ].filter(Boolean) as { label: string; href: string; bad: boolean }[] : [];

  return (
    <div className="space-y-5">
      <PageHead title="Diagnosa Bisnis AI" tutorial={false} crumbs={[["Laporan Bisnis"], ["Diagnosa Bisnis AI"]]}>
        <div className="flex flex-wrap items-center gap-2">
          <DateRange value={range} onChange={setRange} />
          <button onClick={() => runDiagnosis()} disabled={analyzing || !connected} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={16} />}{diagnosis ? "Diagnosa Ulang AI" : "Jalankan Diagnosa AI"}
          </button>
        </div>
      </PageHead>

      {loadErr && <Panel className="border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700"><b>Gagal memuat data diagnosa:</b> {loadErr}</Panel>}

      {!loading && !loadErr && !connected && (
        <Panel className="flex flex-wrap items-center justify-between gap-4 border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <b className="text-sm text-amber-900">API Key Google Gemini belum dihubungkan</b>
              <p className="text-xs text-amber-800">Masukkan API Key Gemini Anda (gratis dari Google AI Studio) di Pengaturan → Integrasi agar AI bisa mendiagnosa bisnis Anda.</p>
            </div>
          </div>
          <Link href="/settings/integrations" className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700"><Settings size={14} />Atur API Key Gemini</Link>
        </Panel>
      )}

      {f && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Laba Bersih</span><TrendingUp size={15} className={f.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"} /></div>
            <p className={`mt-2 text-xl font-bold tabular-nums ${f.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{rupiah(f.net_profit)}</p>
            <p className="mt-1 text-[11px] text-slate-400">Margin {f.net_margin_pct}%</p>
            <Delta now={f.net_profit} before={prev?.net_profit} />
          </Panel>
          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Omzet</span><Gauge size={15} className="text-indigo-600" /></div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{rupiah(f.revenue)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{f.orders_count} pesanan · {f.cancelled_orders} batal · {f.returns_count} retur</p>
            <Delta now={f.revenue} before={prev?.revenue} />
          </Panel>
          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Biaya Platform &amp; Iklan</span><TrendingDown size={15} className="text-indigo-600" /></div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{rupiah(f.platform_fees + f.ad_spend)}</p>
            <p className="mt-1 text-[11px] text-slate-400">Platform {rupiah(f.platform_fees)} · Iklan {rupiah(f.ad_spend)}</p>
            {f.ad_waste_estimate > 0 && <p className="text-[11px] font-semibold text-rose-600">Iklan rugi/boros {rupiah(f.ad_waste_estimate)}</p>}
          </Panel>
          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Modal di Gudang</span><Wallet size={15} className="text-amber-600" /></div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{rupiah(f.warehouse_modal)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{snapshot?.stock_forecast?.dead_value ? `Stok mati ${rupiah(snapshot.stock_forecast.dead_value)}` : "Sisa stok × HPP"}</p>
          </Panel>
        </div>
      )}

      {ops.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ops.map((o) => (
            <Link key={o.href + o.label} href={o.href} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${o.bad ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>{o.label}<ArrowRight size={12} /></Link>
          ))}
        </div>
      )}

      <Panel className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input h-10 flex-1 text-sm" placeholder="Tanya AI lebih spesifik (opsional), misal: Produk mana yang iklannya harus dimatikan dulu?" maxLength={500}
            value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && connected && !analyzing && runDiagnosis()} />
          <button onClick={() => runDiagnosis()} disabled={analyzing || !connected} className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}Tanya &amp; Analisa
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUESTIONS.map((q) => <button key={q} onClick={() => runDiagnosis(q)} disabled={analyzing || !connected} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50">{q}</button>)}
        </div>
      </Panel>

      {analyzing ? (
        <Panel className="flex flex-col items-center gap-3 py-14 text-center">
          <Loader2 size={28} className="animate-spin text-brand-600" />
          <p className="text-sm font-semibold text-slate-700">Gemini AI sedang menganalisa bisnis Anda…</p>
          <ul className="space-y-1 text-left text-xs">
            {STEPS.map((s, i) => <li key={s} className={i < step ? "text-emerald-600" : i === step ? "font-semibold text-slate-700" : "text-slate-400"}>{i < step ? "✓" : i === step ? "•" : "○"} {s}</li>)}
          </ul>
          <p className="text-[11px] text-slate-400">Biasanya 20–60 detik.</p>
        </Panel>
      ) : diagnosis ? (
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-bold ${diagnosis.health_score >= 75 ? "border-emerald-300 bg-emerald-50 text-emerald-700" : diagnosis.health_score >= 50 ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>
                <span className="text-2xl leading-none">{diagnosis.health_score}</span><span className="text-[10px] font-medium">/100</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Skor Kesehatan Bisnis: {diagnosis.health_label}</h2>
                  {before && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${diagnosis.health_score >= before.score ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{diagnosis.health_score >= before.score ? "▲" : "▼"} {Math.abs(diagnosis.health_score - before.score)} dari diagnosa {new Date(before.at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
                  {diagnosis.model && <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{diagnosis.model}{diagnosis.generated_at ? ` · ${new Date(diagnosis.generated_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{diagnosis.executive_summary}</p>
                {diagnosis.trend?.summary && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                    {diagnosis.trend.direction === "turun" ? <TrendingDown size={14} className="mt-0.5 shrink-0 text-rose-600" /> : <TrendingUp size={14} className="mt-0.5 shrink-0 text-emerald-600" />}
                    <span><b className="capitalize">Tren {diagnosis.trend.direction}:</b> {diagnosis.trend.summary}</span>
                  </p>
                )}
              </div>
            </div>
            {diagnosis.custom_answer && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-sm text-indigo-950">
                <b className="block text-xs uppercase tracking-wide text-indigo-700">Jawaban Pertanyaan Anda</b>
                <p className="mt-1 whitespace-pre-line">{diagnosis.custom_answer}</p>
              </div>
            )}
          </Panel>

          {!!diagnosis.quick_wins?.length && (
            <Section icon={Zap} color="text-amber-500" title="Bisa Dikerjakan Hari Ini">
              <div className="grid gap-3 md:grid-cols-2">
                {diagnosis.quick_wins.map((q, i) => (
                  <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 text-xs">
                    <div className="flex items-start justify-between gap-2"><b className="text-sm text-slate-900">{q.title}</b><Go link={q.link} /></div>
                    {q.impact && <p className="mt-1 font-semibold text-amber-700">{q.impact}</p>}
                    <p className="mt-1 text-slate-700">{q.action}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!!diagnosis.financial_leaks?.length && (
            <Section icon={ShieldAlert} color="text-rose-600" title="Kebocoran Dana">
              <div className="space-y-2.5">
                {diagnosis.financial_leaks.map((l, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/80 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${(SEVERITY[l.severity] ?? SEVERITY.medium).cls}`}>{(SEVERITY[l.severity] ?? SEVERITY.medium).label}</span>
                        <b className="text-sm text-slate-900">{l.title}</b>
                      </div>
                      <div className="flex items-center gap-2">{l.estimated_impact && <span className="text-xs font-bold text-rose-600">Dampak: {l.estimated_impact}</span>}<Go link={l.link} /></div>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">{l.detail}</p>
                    <p className="mt-1.5 text-xs font-semibold text-emerald-700">Solusi: {l.action}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!!diagnosis.shops_audit?.length && (
            <Section icon={Bot} color="text-brand-600" title="Audit & Tindakan Per Toko">
              <div className="grid gap-3 md:grid-cols-2">
                {diagnosis.shops_audit.map((sh, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2"><b className="text-sm text-slate-900">{sh.shop_name}</b><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone(sh.status)}`}>{sh.status}</span></div>
                    <p className="mt-1.5 text-slate-600">{sh.summary}</p>
                    <div className="mt-1.5 flex items-start justify-between gap-2"><p className="font-semibold text-brand-700">Tindakan: {sh.action}</p><Go link={sh.link} /></div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!!diagnosis.ads_audit?.length && (
            <Section icon={Megaphone} color="text-[#ee4d2d]" title="Audit Iklan"
              extra={<Link href="/marketplace/ads" className="text-xs font-semibold text-brand-700">Analisa AI Iklan lengkap →</Link>}>
              <div className="space-y-2.5">
                {diagnosis.ads_audit.map((ad, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/80 p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{ad.shop_name}</span><b className="text-sm text-slate-900">{ad.campaign_name}</b></div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${tone(ad.verdict)}`}>{ad.verdict}</span>
                    </div>
                    <p className="mt-1.5 text-slate-500">{ad.metrics}</p>
                    <p className="mt-1 font-semibold text-slate-800">Tindakan: {ad.action}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={TrendingDown} color="text-rose-600" title="Produk Rugi / Margin Tipis">
              <div className="space-y-2.5">
                {diagnosis.loss_products_advice?.length ? diagnosis.loss_products_advice.map((p, i) => (
                  <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/30 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2"><b className="block text-sm text-slate-900">{p.product_name}</b><Go link={p.link} /></div>
                    <p className="mt-1 text-rose-700">{p.issue}</p>
                    <p className="mt-1 font-semibold text-slate-800">Tindakan: {p.action}</p>
                  </div>
                )) : <p className="text-xs text-slate-500">Tidak ada produk rugi yang terdeteksi di periode ini.</p>}
              </div>
            </Section>
            <Section icon={Flame} color="text-emerald-600" title="Produk Terlaris & Strategi Scale-Up">
              <div className="space-y-2.5">
                {diagnosis.best_products_advice?.length ? diagnosis.best_products_advice.map((p, i) => (
                  <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2"><b className="block text-sm text-slate-900">{p.product_name}</b><Go link={p.link} /></div>
                    <p className="mt-1 text-emerald-700">{p.insight}</p>
                    <p className="mt-1 font-semibold text-slate-800">Strategi: {p.action}</p>
                  </div>
                )) : <p className="text-xs text-slate-500">Belum ada data penjualan.</p>}
              </div>
            </Section>
          </div>

          {!!diagnosis.operations?.length && (
            <Section icon={Wrench} color="text-indigo-600" title="Operasional: Stok, Ulasan, Pengiriman, COD, Klaim">
              <div className="grid gap-3 md:grid-cols-2">
                {diagnosis.operations.map((o, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/80 p-3.5 text-xs">
                    <div className="flex items-start justify-between gap-2"><span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">{o.area}</span><Go link={o.link} /></div>
                    <p className="mt-1.5 text-slate-600">{o.finding}</p>
                    <p className="mt-1 font-semibold text-slate-800">Tindakan: {o.action}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!!diagnosis.action_plan_7_days?.length && (
            <Section icon={CheckCircle2} color="text-brand-600" title="Rencana Aksi 7 Hari">
              <ul className="space-y-2 text-sm text-slate-700">
                {diagnosis.action_plan_7_days.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                    <span className="flex-1">{typeof s === "string" ? s : <><b>{s.day}:</b> {s.task}</>}</span>
                    {typeof s !== "string" && <Go link={s.link} />}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {history.length > 1 && (
            <Section icon={Sparkles} color="text-brand-600" title="Riwayat Skor Kesehatan">
              <div className="flex items-end gap-2 overflow-x-auto pb-1">
                {history.map((h) => (
                  <div key={h.at} className="flex w-14 shrink-0 flex-col items-center gap-1" title={`${h.from} s/d ${h.to} · laba ${rupiah(h.net_profit)}`}>
                    <span className="text-[11px] font-bold text-slate-700">{h.score}</span>
                    <div className={`w-6 rounded-t ${h.score >= 75 ? "bg-emerald-400" : h.score >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ height: `${Math.max(6, h.score * 0.8)}px` }} />
                    <span className="text-[10px] text-slate-400">{new Date(h.at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : (
        <Panel className="flex flex-col items-center gap-2 py-14 text-center">
          <Bot size={32} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Siap Menganalisa Bisnis Anda</p>
          <p className="max-w-md text-xs text-slate-500">Klik <b>Jalankan Diagnosa AI</b> untuk laporan lengkap: tren laba, kebocoran dana, iklan yang rugi, produk yang harus dinaikkan harganya, dana yang bisa diklaim, stok, dan rencana aksi 7 hari.</p>
        </Panel>
      )}
    </div>
  );
}
