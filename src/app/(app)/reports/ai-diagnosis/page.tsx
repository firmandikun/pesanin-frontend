"use client";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Flame,
  Loader2,
  Settings,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "@/components/DateRange";
import { showAlert } from "@/components/Dialogs";
import { PageHead, Panel } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";

type ProductDiag = {
  key: string;
  name: string;
  sku: string | null;
  channel: string;
  units: number;
  revenue: number;
  cogs: number;
  est_fees: number;
  ad_spend: number;
  net_profit: number;
  margin_pct: number;
};

type Snapshot = {
  period: { from: string; to: string };
  financials: {
    revenue: number;
    cogs: number;
    platform_fees: number;
    ad_spend: number;
    expenses: number;
    net_profit: number;
    net_margin_pct: number;
    orders_count: number;
    cancelled_orders: number;
    returns_count: number;
    ad_waste_estimate: number;
    warehouse_modal: number;
    missing_hpp_count: number;
  };
  loss_products: ProductDiag[];
  best_products: ProductDiag[];
};

type Diagnosis = {
  health_score: number;
  health_label: string;
  executive_summary: string;
  custom_answer?: string | null;
  financial_leaks: {
    title: string;
    severity: "high" | "medium" | "low";
    estimated_impact: string;
    detail: string;
    action: string;
  }[];
  loss_products_advice: { product_name: string; issue: string; action: string }[];
  best_products_advice: { product_name: string; insight: string; action: string }[];
  action_plan_7_days: string[];
  model?: string;
  generated_at?: string;
};

const wibDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
};

const SEVERITY_BADGE: Record<string, string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-sky-50 text-sky-700 ring-sky-200",
};

export default function AiDiagnosisPage() {
  const [range, setRange] = useState({ from: wibDate(-29), to: wibDate(0) });
  const [question, setQuestion] = useState("");
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    api<{ gemini_connected: boolean; snapshot: Snapshot; diagnosis: Diagnosis | null }>(`/reports/ai-diagnosis?${qs}`)
      .then((res) => {
        setConnected(res.gemini_connected);
        setSnapshot(res.snapshot);
        setDiagnosis(res.diagnosis);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const runDiagnosis = async () => {
    setAnalyzing(true);
    try {
      const res = await api<{ snapshot: Snapshot; diagnosis: Diagnosis }>("/reports/ai-diagnosis", {
        method: "POST",
        json: { from: range.from, to: range.to, question: question.trim() || null },
      });
      setSnapshot(res.snapshot);
      setDiagnosis(res.diagnosis);
    } catch (e) {
      showAlert(e instanceof ApiError ? e.message : "Gagal menjalankan diagnosa AI", "Gagal");
    } finally {
      setAnalyzing(false);
    }
  };

  const f = snapshot?.financials;

  return (
    <div className="space-y-5">
      <PageHead title="Diagnosa Bisnis AI" tutorial={false} crumbs={[["Laporan Bisnis"], ["Diagnosa Bisnis AI"]]}>
        <div className="flex flex-wrap items-center gap-2">
          <DateRange value={range} onChange={setRange} />
          <button
            onClick={runDiagnosis}
            disabled={analyzing || !connected}
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={16} />}
            {diagnosis ? "Diagnosa Ulang AI" : "Jalankan Diagnosa AI"}
          </button>
        </div>
      </PageHead>

      {!loading && !connected && (
        <Panel className="flex flex-wrap items-center justify-between gap-4 border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <b className="text-sm text-amber-900">API Key Google Gemini belum dihubungkan</b>
              <p className="text-xs text-amber-800">
                Masukkan API Key Gemini Anda di Pengaturan → Integrasi agar AI bisa mendiagnosa produk rugi, produk terlaris, dan kebocoran dana bisnis.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700"
          >
            <Settings size={14} />
            Atur API Key Gemini
          </Link>
        </Panel>
      )}

      {/* Financial Snapshot KPIs */}
      {f && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Laba Bersih Periode</span>
              <TrendingUp size={15} className={f.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"} />
            </div>
            <p className={`mt-2 text-xl font-bold tabular-nums ${f.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {rupiah(f.net_profit)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Omzet {rupiah(f.revenue)} · Margin {f.net_margin_pct}%
            </p>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Kebocoran Iklan &amp; Batal</span>
              <ShieldAlert size={15} className="text-rose-600" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-rose-600">{rupiah(f.ad_waste_estimate)}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {f.cancelled_orders} batal · {f.returns_count} retur · {snapshot?.loss_products.length ?? 0} produk margin tipis/rugi
            </p>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Modal Tertahan di Gudang</span>
              <Wallet size={15} className="text-amber-600" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{rupiah(f.warehouse_modal)}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {f.missing_hpp_count > 0 ? `${f.missing_hpp_count} produk terjual belum ada HPP` : "Semua produk terjual sudah ada HPP"}
            </p>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Biaya Platform &amp; Iklan</span>
              <TrendingDown size={15} className="text-indigo-600" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{rupiah(f.platform_fees + f.ad_spend)}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Platform {rupiah(f.platform_fees)} · Iklan {rupiah(f.ad_spend)}
            </p>
          </Panel>
        </div>
      )}

      {/* Ask specific question bar */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input h-10 flex-1 text-sm"
            placeholder="Tanya AI lebih spesifik (opsional), misal: 'Produk mana yang iklannya harus dimatikan dulu?' atau 'Berapa persen saya harus naikkan harga?'"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connected && !analyzing && runDiagnosis()}
          />
          <button
            onClick={runDiagnosis}
            disabled={analyzing || !connected}
            className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
            Tanya &amp; Analisa
          </button>
        </div>
      </Panel>

      {/* AI Diagnosis Output */}
      {analyzing ? (
        <Panel className="flex flex-col items-center gap-3 py-16 text-center">
          <Loader2 size={28} className="animate-spin text-brand-600" />
          <p className="text-sm font-semibold text-slate-700">Gemini AI sedang menganalisa data bisnis Anda…</p>
          <p className="text-xs text-slate-400">Membaca omzet, HPP, biaya Shopee, iklan rugi, retur, dan stok master.</p>
        </Panel>
      ) : diagnosis ? (
        <div className="space-y-4">
          {/* Health Score & Summary */}
          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-bold ${
                  diagnosis.health_score >= 75
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : diagnosis.health_score >= 50
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-rose-300 bg-rose-50 text-rose-700"
                }`}>
                  <span className="text-2xl leading-none">{diagnosis.health_score}</span>
                  <span className="text-[10px] font-medium">/100</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Skor Kesehatan Bisnis: {diagnosis.health_label}</h2>
                    {diagnosis.model && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {diagnosis.model}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{diagnosis.executive_summary}</p>
                </div>
              </div>
            </div>
            {diagnosis.custom_answer && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-sm text-indigo-950">
                <b className="block text-xs uppercase tracking-wide text-indigo-700">Jawaban Pertanyaan Anda</b>
                <p className="mt-1">{diagnosis.custom_answer}</p>
              </div>
            )}
          </Panel>

          {/* Financial Leaks */}
          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldAlert size={16} className="text-rose-600" />
              Deteksi Kebocoran Dana
            </h3>
            <div className="mt-3 space-y-2.5">
              {diagnosis.financial_leaks.map((leak, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200/80 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${SEVERITY_BADGE[leak.severity] ?? SEVERITY_BADGE.medium}`}>
                        {leak.severity === "high" ? "Prioritas Tinggi" : leak.severity === "medium" ? "Sedang" : "Rendah"}
                      </span>
                      <b className="text-sm text-slate-900">{leak.title}</b>
                    </div>
                    {leak.estimated_impact && (
                      <span className="text-xs font-bold text-rose-600">Dampak: {leak.estimated_impact}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">{leak.detail}</p>
                  <p className="mt-1.5 text-xs font-semibold text-emerald-700">Solusi: {leak.action}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Loss Products vs Best Sellers */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <TrendingDown size={16} className="text-rose-600" />
                Produk Rugi / Margin Tipis
              </h3>
              <div className="mt-3 space-y-2.5">
                {diagnosis.loss_products_advice.length ? (
                  diagnosis.loss_products_advice.map((p, i) => (
                    <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/30 p-3 text-xs">
                      <b className="block text-sm text-slate-900">{p.product_name}</b>
                      <p className="mt-1 text-rose-700">{p.issue}</p>
                      <p className="mt-1 font-semibold text-slate-800">Tindakan: {p.action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Tidak ada produk rugi yang terdeteksi di periode ini.</p>
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Flame size={16} className="text-emerald-600" />
                Produk Terlaris &amp; Strategi Scale-Up
              </h3>
              <div className="mt-3 space-y-2.5">
                {diagnosis.best_products_advice.map((p, i) => (
                  <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-xs">
                    <b className="block text-sm text-slate-900">{p.product_name}</b>
                    <p className="mt-1 text-emerald-700">{p.insight}</p>
                    <p className="mt-1 font-semibold text-slate-800">Strategi: {p.action}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* 7-Day Action Plan */}
          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <CheckCircle2 size={16} className="text-brand-600" />
              Rencana Aksi 7 Hari ke Depan
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {diagnosis.action_plan_7_days.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : (
        <Panel className="flex flex-col items-center gap-2 py-14 text-center">
          <Bot size={32} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Siap Menganalisa Bisnis Anda</p>
          <p className="max-w-md text-xs text-slate-500">
            Klik tombol <b>Jalankan Diagnosa AI</b> di kanan atas untuk mendapatkan laporan lengkap kebocoran dana, produk rugi, dan rekomendasi produk terlaris dari Gemini AI.
          </p>
        </Panel>
      )}
    </div>
  );
}
