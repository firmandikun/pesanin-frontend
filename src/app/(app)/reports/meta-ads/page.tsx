"use client";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Loader2, RefreshCcw, Unplug } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { askConfirm } from "@/components/Dialogs";
import { DateRange, useDefaultRange } from "@/components/DateRange";
import { PageHead, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Account = { id: string; name: string; currency: string; status: number; amount_spent: number; spend_cap: number | null; balance: number; prepaid?: boolean; prepaid_balance?: number | null };
type Status = { app_configured: boolean; connected: boolean; name: string | null; token_expires_at: string | null; synced_at: string | null; selected: string[] | null; accounts: Account[]; error: string | null };
type Row = { id: string; name: string; status: string | null; objective: string | null; spend: number; impressions: number; reach: number; clicks: number; ctr: number; results: number; result_label: string | null; cost_per_result: number | null; meta_purchases: number; meta_value: number; messages: number; orders: number; revenue: number; roas: number | null; cost_per_order: number | null };
type Report = { totals: { spend: number; impressions: number; reach: number; clicks: number; results: number; result_label: string | null; meta_purchases: number; meta_value: number; messages: number; orders: number; revenue: number; roas: number | null };
  unmatched: { orders: number; revenue: number; campaigns: string[] }; daily: { date: string; spend: number }[]; campaigns: Row[] };

const ACCOUNT_STATUS: Record<number, [string, string]> = { 1: ["Aktif", "bg-emerald-50 text-emerald-700"], 2: ["Nonaktif", "bg-rose-50 text-rose-700"], 3: ["Tagihan belum lunas", "bg-amber-50 text-amber-700"], 7: ["Ditinjau", "bg-sky-50 text-sky-700"], 9: ["Masa tenggang", "bg-amber-50 text-amber-700"], 101: ["Ditutup", "bg-slate-100 text-slate-500"] };
const CAMPAIGN_STATUS: Record<string, [string, string]> = { ACTIVE: ["Aktif", "bg-emerald-50 text-emerald-700"], PAUSED: ["Dijeda", "bg-slate-100 text-slate-600"], CAMPAIGN_PAUSED: ["Dijeda", "bg-slate-100 text-slate-600"], ARCHIVED: ["Diarsipkan", "bg-slate-100 text-slate-500"], DELETED: ["Dihapus", "bg-slate-100 text-slate-500"], WITH_ISSUES: ["Bermasalah", "bg-rose-50 text-rose-700"], IN_PROCESS: ["Diproses", "bg-sky-50 text-sky-700"] };
const OBJECTIVE: Record<string, string> = { OUTCOME_SALES: "Penjualan", OUTCOME_ENGAGEMENT: "Interaksi", OUTCOME_TRAFFIC: "Traffic", OUTCOME_LEADS: "Prospek", OUTCOME_AWARENESS: "Awareness", OUTCOME_APP_PROMOTION: "Aplikasi" };
const roasTone = (r: number | null) => (r === null ? "text-slate-400" : r >= 3 ? "text-emerald-600" : r >= 1.5 ? "text-amber-600" : "text-rose-600");
const num = (n: number) => n.toLocaleString("id-ID");

export default function Page() {
  return <Suspense fallback={null}><MetaAds /></Suspense>;
}

/** Iklan Meta: spend synced from the Marketing API, judged against the orders Pesanin actually received. */
function MetaAds() {
  const sp = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [range, setRange] = useState(useDefaultRange());
  const [account, setAccount] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    sp.get("connected") ? { ok: true, text: "Akun Meta terhubung. Klik Ambil data iklan untuk menarik 30 hari terakhir." } : sp.get("error") ? { ok: false, text: sp.get("error")! } : null,
  );
  const [token, setToken] = useState("");

  const loadStatus = useCallback(() => api<Status>("/meta-ads").then(setStatus), []);
  const loadReport = useCallback(() => {
    api<Report>(`/meta-ads/report?${new URLSearchParams({ from: range.from, to: range.to, ...(account ? { account } : {}) })}`).then(setReport);
  }, [range, account]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (status?.connected) loadReport(); }, [status?.connected, loadReport]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Terjadi kesalahan" }); } finally { setBusy(""); }
  };
  const login = () => run("login", async () => { const { url } = await api("/meta-ads/connect", { method: "POST" }); window.location.href = url; });
  const saveToken = () => run("token", async () => { const r = await api("/meta-ads/token", { method: "POST", json: { access_token: token.trim() } }); setToken(""); setMsg({ ok: true, text: `Terhubung sebagai ${r.name}. Klik Ambil data iklan.` }); await loadStatus(); });
  const sync = () => run("sync", async () => { const r = await api("/meta-ads/sync", { method: "POST", json: { days: 30 } }); setMsg({ ok: true, text: `Data iklan Meta diperbarui (${r.rows} baris kampanye-hari).` }); await loadStatus(); loadReport(); });
  const disconnect = async () => {
    if (!(await askConfirm("Putuskan akun Meta? Akses Pesanin di akun Facebook-mu juga dicabut. Data iklan yang sudah diambil tetap tersimpan untuk laporan."))) return;
    run("off", async () => { await api("/meta-ads", { method: "DELETE" }); setReport(null); await loadStatus(); });
  };
  const toggleAccount = (id: string) => run("acc", async () => {
    const all = status!.accounts.map((a) => a.id);
    const cur = status!.selected ?? all.filter((x) => status!.accounts.find((a) => a.id === x)?.status !== 101);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (!next.length) { setMsg({ ok: false, text: "Minimal satu akun iklan harus dipilih." }); return; }
    await api("/meta-ads/accounts", { method: "PUT", json: { account_ids: next } }); await loadStatus();
  });

  if (!status) return <p className="flex items-center gap-2 py-16 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />Memuat…</p>;
  const Msg = msg && <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}{msg.text}</div>;

  if (!status.connected) return (
    <div className="space-y-5">
      <PageHead title="Iklan Meta" tutorial={false} crumbs={[["Laporan"], ["Iklan Meta"]]} />
      {Msg}
      <Panel className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-bold text-navy">Hubungkan akun iklan Facebook & Instagram</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Biaya iklan per kampanye diambil otomatis dari Meta, lalu dicocokkan dengan pesanan yang benar-benar masuk ke Pesanin, jadi kamu melihat ROAS dan biaya per pesanan yang asli, bukan klaim Ads Manager. Pesanin hanya meminta izin <b>baca</b> (ads_read).</p>
        </div>
        {status.app_configured && (
          <button onClick={login} disabled={!!busy} className="flex h-11 items-center gap-2 rounded-lg bg-[#1877f2] px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "login" ? <Loader2 size={16} className="animate-spin" /> : <span className="text-base font-black">f</span>}Login dengan Facebook
          </button>
        )}
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy"><KeyRound size={15} />{status.app_configured ? "Atau tempel access token" : "Tempel access token"}</p>
          <p className="mt-1 text-xs text-slate-500">Buka <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="font-semibold text-brand-600">Graph API Explorer <ExternalLink size={11} className="inline" /></a>, pilih app kamu, tambahkan izin <code className="rounded bg-white px-1">ads_read</code>, klik Generate Access Token, lalu salin ke sini.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className="input h-10 min-w-[260px] flex-1 font-mono text-xs" placeholder="EAAG…" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
            <button onClick={saveToken} disabled={token.trim().length < 20 || !!busy} className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "token" && <Loader2 size={15} className="animate-spin" />}Hubungkan</button>
          </div>
        </div>
      </Panel>
    </div>
  );

  const t = report?.totals;
  const maxDaily = Math.max(1, ...(report?.daily.map((d) => d.spend) ?? [0]));
  const selected = status.selected ?? status.accounts.filter((a) => a.status !== 101).map((a) => a.id);
  return (
    <div className="space-y-5">
      <PageHead title="Iklan Meta" tutorial={false} crumbs={[["Laporan"], ["Iklan Meta"]]}>
        <button onClick={sync} disabled={!!busy} className="flex h-10 items-center gap-2 rounded-lg bg-[#1877f2] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "sync" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Ambil data iklan</button>
        <button onClick={disconnect} className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-600 hover:text-rose-600" title="Putuskan Pesanin dari akun Facebook"><Unplug size={16} />Putuskan</button>
      </PageHead>
      {Msg}
      {status.error && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{status.error}</p>}

      <Panel className="p-4">
        <p className="text-xs text-slate-500">Terhubung sebagai <b className="text-navy">{status.name}</b>{status.synced_at && ` · diperbarui ${new Date(status.synced_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}{status.token_expires_at && ` · akses berlaku s/d ${new Date(status.token_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {status.accounts.map((a) => {
            const [label, tone] = ACCOUNT_STATUS[a.status] ?? ["-", "bg-slate-100 text-slate-500"];
            return (
              <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected.includes(a.id) ? "border-[#1877f2]/40 bg-blue-50/40" : "border-slate-100"}`}>
                <input type="checkbox" className="mt-1" checked={selected.includes(a.id)} onChange={() => toggleAccount(a.id)} disabled={!!busy} />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="flex items-center gap-2"><b className="truncate text-navy">{a.name}</b><span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span></span>
                  <span className="block text-xs text-slate-400">{a.id.replace("act_", "ID ")} · {a.currency}</span>
                  {a.prepaid && (
                    <span className={`mt-1 block text-xs font-semibold ${a.prepaid_balance ? "text-emerald-700" : "text-rose-600"}`}>Saldo prabayar {a.prepaid_balance === null || a.prepaid_balance === undefined ? "-" : rupiah(a.prepaid_balance)}{a.prepaid_balance === 0 && " · iklan tidak tayang sampai saldo diisi"}
                      {a.prepaid_balance === 0 && <a href={`https://business.facebook.com/billing_hub/payment_settings/?asset_id=${a.id.replace("act_", "")}`} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-[#1877f2]" onClick={(e) => e.stopPropagation()}>Tambah dana<ExternalLink size={11} /></a>}</span>
                  )}
                  <span className="mt-1 block text-xs text-slate-600">{a.prepaid ? "Tagihan" : "Tagihan berjalan"} <b>{rupiah(a.balance)}</b>{a.spend_cap ? <> · batas belanja <b>{rupiah(a.spend_cap)}</b> (terpakai {rupiah(a.amount_spent)})</> : <> · total belanja {rupiah(a.amount_spent)}</>}</span>
                </span>
              </label>
            );
          })}
          {!status.accounts.length && <p className="text-sm text-slate-500">Tidak ada akun iklan yang bisa dibaca dengan akses ini.</p>}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <DateRange value={range} onChange={setRange} />
        {status.accounts.length > 1 && (
          <Select className="input h-10 w-60" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Semua akun iklan</option>
            {status.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        )}
      </div>

      {!report ? <p className="flex items-center gap-2 py-10 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" />Memuat laporan…</p> : (
        <>
          {[
            ["Dari Meta", [
              ["Biaya iklan", rupiah(t!.spend), report.daily.length ? `${report.daily.length} hari` : ""],
              ["Impresi", num(t!.impressions), "berapa kali iklan dilihat"],
              ["Jangkauan", num(t!.reach), "orang unik yang melihat"],
              ["Klik", num(t!.clicks), t!.impressions ? `CTR ${String(Math.round((t!.clicks / t!.impressions) * 1000) / 10).replace(".", ",")}%` : ""],
              [t!.result_label ? `Hasil · ${t!.result_label}` : "Hasil", num(t!.results), t!.results ? `${rupiah(Math.round(t!.spend / t!.results))} per hasil` : "versi Meta"],
            ]],
            ["Di Pesanin", [
              ["Pesanan masuk", num(t!.orders), t!.meta_purchases ? `Meta mengklaim ${num(t!.meta_purchases)} pembelian` : "dari link iklan Meta"],
              ["Omzet", rupiah(t!.revenue), t!.meta_value ? `Meta mengklaim ${rupiah(t!.meta_value)}` : "pesanan tidak termasuk batal"],
              ["ROAS asli", t!.roas === null ? "-" : `${String(t!.roas).replace(".", ",")}x`, "omzet Pesanin ÷ biaya iklan"],
              ["Biaya per pesanan", t!.orders ? rupiah(Math.round(t!.spend / t!.orders)) : "-", "biaya iklan ÷ pesanan"],
            ]],
          ].map(([group, items]) => (
            <div key={group as string}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group as string}</p>
              <div className={`grid gap-3 sm:grid-cols-2 ${(items as string[][]).length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
                {(items as string[][]).map(([l, v, h]) => (
                  <div key={l} className="rounded-xl bg-white p-4"><p className="truncate text-xs text-slate-500" title={l}>{l}</p>
                    <p className={`mt-1 truncate text-xl font-bold ${l === "ROAS asli" ? roasTone(t!.roas) : "text-navy"}`}>{v}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{h}</p></div>
                ))}
              </div>
            </div>
          ))}

          {report.daily.length > 0 && (
            <Panel className="p-5">
              <h2 className="font-bold text-navy">Biaya iklan per hari</h2>
              <div className="mt-4 flex h-32 items-end gap-1">
                {report.daily.map((x) => <div key={x.date} className="group flex-1" title={`${new Date(x.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}: ${rupiah(x.spend)}`}><div className="w-full rounded-t bg-[#1877f2]/75 group-hover:bg-[#1877f2]" style={{ height: `${Math.max(2, (x.spend / maxDaily) * 128)}px` }} /></div>)}
              </div>
            </Panel>
          )}

          {report.unmatched.orders > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{report.unmatched.orders} pesanan dari Meta ({rupiah(report.unmatched.revenue)}) tidak cocok dengan kampanye mana pun{report.unmatched.campaigns.length > 0 && ` (utm_campaign: ${report.unmatched.campaigns.join(", ")})`}. Di Ads Manager, isi <b>URL parameters</b> iklan dengan <code className="rounded bg-white px-1">utm_source=facebook&amp;utm_campaign={"{{campaign.name}}"}</code> supaya tiap pesanan tercatat ke kampanyenya.</span></p>
          )}

          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>{["Kampanye", "Biaya", "Impresi", "Jangkauan", "Klik · CTR", "Hasil (Meta)", "Pesanan", "Omzet", "ROAS asli", "Biaya/pesanan"].map((h, i) => <th key={h} className={`whitespace-nowrap px-3 py-3 font-semibold ${i ? "text-right" : "pl-4"}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.campaigns.map((c) => {
                  const [label, tone] = CAMPAIGN_STATUS[c.status ?? ""] ?? [c.status ?? "-", "bg-slate-100 text-slate-500"];
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3"><p className="max-w-[280px] truncate font-medium text-navy" title={c.name}>{c.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>{OBJECTIVE[c.objective ?? ""] ?? c.objective}</p></td>
                      <td className="px-3 py-3 text-right font-semibold text-navy">{rupiah(c.spend)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(c.impressions)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(c.reach)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">{num(c.clicks)} · {String(c.ctr).replace(".", ",")}%</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{c.results ? <><b className="text-navy">{num(c.results)}</b><span className="block text-[11px] text-slate-400">{c.result_label}{c.cost_per_result ? ` · ${rupiah(c.cost_per_result)}/hasil` : ""}</span></> : <span className="text-slate-400">-</span>}</td>
                      <td className="px-3 py-3 text-right font-semibold text-navy">{num(c.orders)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{rupiah(c.revenue)}</td>
                      <td className={`px-3 py-3 text-right font-bold ${roasTone(c.roas)}`}>{c.roas === null ? "-" : `${String(c.roas).replace(".", ",")}x`}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">{c.cost_per_order ? rupiah(c.cost_per_order) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!report.campaigns.length && <p className="py-12 text-center text-sm text-slate-500">Belum ada data kampanye pada periode ini. Klik <b>Ambil data iklan</b>.</p>}
          </Panel>
          <p className="text-xs text-slate-400">Biaya iklan Meta yang diambil otomatis juga masuk ke Laporan → Biaya Iklan dan laporan laba. Hapus catatan biaya Meta yang dulu diinput manual untuk periode yang sama supaya tidak terhitung dua kali.</p>
        </>
      )}
    </div>
  );
}
