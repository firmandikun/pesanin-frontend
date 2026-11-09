"use client";
import { CheckCircle2, Clock, Copy, CreditCard, FileText, Printer, QrCode, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { BankLogo } from "@/components/Logos";
import { Dialog } from "@/components/kit";
import { api, ApiError, rupiah } from "@/lib/api";
import { Billing, fmtDay, Invoice, INVOICE_STATUS, METHOD, PlanInfo } from "./types";
import { showAlert } from "@/components/Dialogs";

const GROUPS = ["Virtual Account", "QRIS", "E-Wallet"] as const;

export function CheckoutDialog({ plan, billing, data, onClose, onCreated }: {
  plan: PlanInfo; billing: "monthly" | "yearly"; data: Billing; onClose: () => void; onCreated: (inv: Invoice) => void;
}) {
  const [period, setPeriod] = useState(billing);
  const [method, setMethod] = useState("va_bca");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const amount = period === "yearly" ? plan.yearly : plan.monthly;
  const tax = Math.round((amount * data.tax_percent) / 100);
  const renew = data.plan === plan.id && data.expires_at && new Date(data.expires_at) > new Date();
  const start = renew ? new Date(data.expires_at!) : new Date();
  const end = new Date(start); period === "yearly" ? end.setFullYear(end.getFullYear() + 1) : end.setMonth(end.getMonth() + 1);
  const current = data.plans.find((p) => p.id === data.plan)!;
  const kind = renew ? "Perpanjang" : plan.rank > current.rank ? "Upgrade ke" : plan.rank < current.rank ? "Pindah ke" : "Aktifkan";

  async function submit() {
    setSaving(true); setError("");
    try { onCreated(await api<Invoice>("/billing/checkout", { method: "POST", json: { plan: plan.id, billing: period, method } })); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Gagal membuat tagihan"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog title={`${kind} paket ${plan.name}`} icon={CreditCard} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Periode tagihan</p>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "yearly"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className={`rounded-xl border-2 p-3 text-left transition ${period === p ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="flex items-center justify-between text-sm font-bold text-navy">{p === "yearly" ? "Tahunan" : "Bulanan"}{p === "yearly" && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] text-white">Hemat 2 bulan</span>}</span>
                  <span className="mt-1 block text-sm text-slate-500">{rupiah(p === "yearly" ? plan.yearly : plan.monthly)} / {p === "yearly" ? "tahun" : "bulan"}</span>
                </button>
              ))}
            </div>
          </div>
          {GROUPS.map((g) => (
            <div key={g}>
              <p className="mb-2 text-sm font-semibold text-slate-700">{g}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.methods.filter((m) => METHOD[m]?.group === g).map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition ${method === m ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <BankLogo bank={METHOD[m].logo} small /><span className="flex-1 font-medium text-slate-700">{METHOD[m].label.replace(" Virtual Account", "")}</span>
                    <span className={`h-4 w-4 rounded-full border-2 ${method === m ? "border-[5px] border-brand-500" : "border-slate-300"}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <aside className="h-max rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="font-bold text-navy">Ringkasan</p>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between"><dt className="text-slate-500">Paket</dt><dd className="font-medium text-navy">{plan.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Masa aktif</dt><dd className="text-right font-medium text-navy">{start.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – {end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2"><dt className="text-slate-500">Subtotal</dt><dd>{rupiah(amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">PPN {data.tax_percent}%</dt><dd>{rupiah(tax)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-bold text-navy">Total</dt><dd className="font-extrabold text-navy">{rupiah(amount + tax)}</dd></div>
          </dl>
          {!renew && plan.rank < current.rank && data.plan !== "gratis" && (
            <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">Paket baru langsung berlaku setelah dibayar dan menggantikan sisa masa paket {current.name}.</p>
          )}
          {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-600">{error}</p>}
          <button onClick={submit} disabled={saving} className="mt-4 h-11 w-full rounded-xl bg-brand-500 font-bold text-white transition hover:bg-brand-600 disabled:opacity-50">{saving ? "Memproses…" : "Buat Tagihan"}</button>
          <p className="mt-2 text-center text-[11px] text-slate-400">Tagihan berlaku 24 jam</p>
        </aside>
      </div>
    </Dialog>
  );
}

function useCountdown(to: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, new Date(to).getTime() - now);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(ms / 36e5))}:${p(Math.floor((ms % 36e5) / 6e4))}:${p(Math.floor((ms % 6e4) / 1e3))}`;
}

const STEPS: Record<string, string[]> = {
  "Virtual Account": ["Buka m-banking atau ATM bank yang dipilih.", "Pilih menu Transfer → Virtual Account.", "Masukkan nomor Virtual Account di atas.", "Pastikan nominal sesuai, lalu konfirmasi pembayaran."],
  QRIS: ["Buka aplikasi bank atau e-wallet yang mendukung QRIS.", "Pindai kode QR di atas.", "Periksa nominal, lalu konfirmasi pembayaran."],
  "E-Wallet": ["Klik tombol bayar untuk membuka aplikasi e-wallet.", "Login dan periksa detail tagihan.", "Konfirmasi pembayaran dengan PIN."],
};

/** Deterministic placeholder QR pattern (no gateway yet). */
function QrPlaceholder({ seed }: { seed: string }) {
  const cells: boolean[] = [];
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = 0; i < 21 * 21; i++) { h = (h * 1103515245 + 12345) >>> 0; cells.push((h >>> 16) % 2 === 0); }
  const finder = (x: number, y: number) => [[0, 0], [14, 0], [0, 14]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const finderOn = (x: number, y: number) => { const fx = x % 14 >= 7 ? x - 14 : x % 14, fy = y >= 14 ? y - 14 : y; const d = Math.max(Math.abs(fx - 3), Math.abs(fy - 3)); return d !== 2; };
  return (
    <svg viewBox="0 0 21 21" className="h-44 w-44" shapeRendering="crispEdges" aria-label="Kode QR">
      {cells.map((on, i) => { const x = i % 21, y = Math.floor(i / 21); const v = finder(x, y) ? finderOn(x, y) : on; return v ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0e1b38" /> : null; })}
    </svg>
  );
}

export function PayDialog({ invoice, canSimulate, onClose, onChanged }: { invoice: Invoice; canSimulate: boolean; onClose: () => void; onChanged: () => void }) {
  const m = METHOD[invoice.method] ?? { label: invoice.method, logo: invoice.method, group: "Virtual Account" as const };
  const left = useCountdown(invoice.due_at);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const copy = () => { navigator.clipboard?.writeText(invoice.pay_code ?? "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  const act = async (path: string, key: string) => {
    setBusy(key);
    try { await api(`/billing/invoices/${invoice.id}/${path}`, { method: "POST" }); onChanged(); onClose(); }
    catch (e) { showAlert(e instanceof ApiError ? e.message : "Gagal", "Gagal"); }
    finally { setBusy(""); }
  };

  return (
    <Dialog title="Selesaikan pembayaran" icon={Wallet} onClose={onClose} width="max-w-md">
      <div className="text-center">
        <p className="text-sm text-slate-500">Total pembayaran</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-navy">{rupiah(invoice.total)}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><Clock size={13} />Bayar dalam {left}</p>
      </div>
      {invoice.payment_url ? (
        <a href={invoice.payment_url} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-white hover:bg-navy/90"><Wallet size={16} />Bayar sekarang via Midtrans</a>
      ) : null}
      <div className={`mt-5 rounded-2xl border border-slate-200 p-4 ${invoice.payment_url ? "hidden" : ""}`}>
        <div className="flex items-center gap-3"><BankLogo bank={m.logo} /><span className="font-semibold text-navy">{m.label}</span></div>
        {m.group === "Virtual Account" && invoice.pay_code && (
          <div className="mt-4">
            <p className="text-xs text-slate-500">Nomor Virtual Account</p>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="font-mono text-lg font-bold tracking-wider text-navy">{invoice.pay_code.replace(/(\d{4})(?=\d)/g, "$1 ")}</span>
              <button onClick={copy} className="flex items-center gap-1 text-sm font-semibold text-brand-600">{copied ? <><CheckCircle2 size={15} />Tersalin</> : <><Copy size={15} />Salin</>}</button>
            </div>
          </div>
        )}
        {m.group === "QRIS" && <div className="mt-4 flex flex-col items-center rounded-xl bg-white p-3 ring-1 ring-slate-200"><QrPlaceholder seed={invoice.number} /><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><QrCode size={13} />Berlaku untuk semua aplikasi QRIS</p></div>}
        {m.group === "E-Wallet" && <button className="mt-4 h-11 w-full rounded-xl bg-navy text-sm font-bold text-white">Bayar dengan {m.label}</button>}
      </div>
      <ol className="mt-4 space-y-2 text-sm text-slate-600">
        {!invoice.payment_url && STEPS[m.group].map((s, i) => <li key={s} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-50 text-[11px] font-bold text-navy">{i + 1}</span>{s}</li>)}
      </ol>
      <p className="mt-4 text-xs text-slate-500">Paket aktif otomatis setelah pembayaran diterima. No. tagihan <b>{invoice.number}</b>.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <button onClick={() => act("cancel", "cancel")} disabled={!!busy} className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-rose-600">{busy === "cancel" ? "…" : "Batalkan tagihan"}</button>
        {canSimulate && <button onClick={() => act("simulate-pay", "pay")} disabled={!!busy} className="h-10 rounded-lg border border-dashed border-emerald-400 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">{busy === "pay" ? "…" : "Simulasi bayar (dev)"}</button>}
        <button onClick={onClose} className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">Saya sudah bayar</button>
      </div>
    </Dialog>
  );
}

export function InvoiceDialog({ invoice, plans, onClose }: { invoice: Invoice; plans: PlanInfo[]; onClose: () => void }) {
  const [label, cls] = INVOICE_STATUS[invoice.status];
  const name = plans.find((p) => p.id === invoice.plan)?.name ?? invoice.plan;
  return (
    <Dialog title="Detail tagihan" icon={FileText} onClose={onClose} width="max-w-lg">
      <div id="invoice-print" className="text-sm">
        <div className="flex items-start justify-between">
          <div><p className="text-xs text-slate-500">No. tagihan</p><p className="font-mono font-bold text-navy">{invoice.number}</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-y-3">
          <dt className="text-slate-500">Dibuat</dt><dd className="text-right text-navy">{fmtDay(invoice.created_at)}</dd>
          <dt className="text-slate-500">Dibayar</dt><dd className="text-right text-navy">{invoice.paid_at ? fmtDay(invoice.paid_at) : "-"}</dd>
          <dt className="text-slate-500">Metode</dt><dd className="text-right text-navy">{METHOD[invoice.method]?.label ?? invoice.method}</dd>
        </dl>
        <table className="mt-5 w-full">
          <tbody>
            <tr className="border-y border-slate-100"><td className="py-3"><b className="text-navy">Paket {name}</b><span className="block text-xs text-slate-500">{invoice.billing === "yearly" ? "Tahunan" : "Bulanan"} · {fmtDay(invoice.period_start)} – {fmtDay(invoice.period_end)}</span></td><td className="py-3 text-right">{rupiah(invoice.amount)}</td></tr>
            <tr><td className="pt-3 text-slate-500">PPN</td><td className="pt-3 text-right">{rupiah(invoice.tax)}</td></tr>
            <tr><td className="pt-2 font-bold text-navy">Total</td><td className="pt-2 text-right text-lg font-extrabold text-navy">{rupiah(invoice.total)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <button onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-navy hover:bg-slate-50"><Printer size={16} />Cetak</button>
      </div>
    </Dialog>
  );
}
