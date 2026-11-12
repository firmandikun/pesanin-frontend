"use client";

import { Ban, CheckCircle2, Search, Shield, X } from "lucide-react";
import { askConfirm } from "@/components/Dialogs";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ShopeeMark } from "@/components/ChannelBadge";
import { DatePicker } from "@/components/DatePicker";
import { Pager, Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, Paginated, rupiah } from "@/lib/api";

type Row = {
  id: number; name: string; email: string; store_name: string; whatsapp: string | null; plan: string; active_plan: string; plan_billing: string | null;
  plan_expires_at: string | null; is_admin: boolean; suspended_at: string | null; created_at: string; mrr: number;
  orders_count: number | null; shops_count: number | null; products_count: number | null;
};
type Detail = Row & {
  orders_30d: number; gmv_30d: number;
  shops: { id: number; shop_name: string; shop_id: number; status: string; is_demo: boolean; last_error: string | null; orders_synced_at: string | null }[];
  integrations: { provider: string; status: string; updated_at: string }[];
  invoices: { id: number; number: string; plan: string; billing: string; total: number; status: string; method: string; created_at: string; paid_at: string | null }[];
  activity: { action: string; description: string; created_at: string }[];
};

const PLANS = [["gratis", "Gratis"], ["starter", "Starter"], ["bisnis", "Bisnis"], ["pro", "Pro"]] as const;
const PLAN_TONE: Record<string, string> = { gratis: "bg-slate-100 text-slate-600", starter: "bg-sky-50 text-sky-700", bisnis: "bg-brand-50 text-brand-700", pro: "bg-violet-50 text-violet-700" };
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");

function Users() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [data, setData] = useState<Paginated<Row> & { total: number } | null>(null);
  const [openId, setOpenId] = useState<number | null>(params.get("open") ? Number(params.get("open")) : null);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage), ...(search ? { search } : {}), ...(plan ? { plan } : {}), ...(status ? { status } : {}) });
    api<Paginated<Row> & { total: number }>(`/admin/users?${q}`).then(setData);
  }, [page, perPage, search, plan, status]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold text-navy">Pengguna</h1><p className="text-sm text-slate-500">Semua seller yang terdaftar di Pesanin.</p></div>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" placeholder="Cari nama, email, toko, WhatsApp" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <Select className="input h-10 w-40" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}><option value="">Semua paket</option>{PLANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Select className="input h-10 w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Semua status</option><option value="active">Aktif</option><option value="suspended">Dinonaktifkan</option><option value="expiring">Paket berakhir ≤ 7 hari</option><option value="admin">Admin</option></Select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{["Seller", "Paket", "Berlaku s/d", "Pesanan", "Toko", "Produk", "Daftar", "Status"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{(data?.data ?? []).map((u) => (
            <tr key={u.id} onClick={() => setOpenId(u.id)} className="cursor-pointer hover:bg-slate-50">
              <td className="px-4 py-3"><b className="flex items-center gap-1.5 text-navy">{u.store_name || u.name}{u.is_admin && <Shield size={13} className="text-brand-600" />}</b><span className="text-xs text-slate-500">{u.email}</span></td>
              <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${PLAN_TONE[u.active_plan]}`}>{PLANS.find((p) => p[0] === u.active_plan)?.[1]}</span>{u.active_plan !== u.plan && <span className="block pt-1 text-[11px] text-rose-500">{u.plan} kedaluwarsa</span>}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{u.active_plan === "gratis" ? "-" : date(u.plan_expires_at)}</td>
              <td className="px-4 py-3">{u.orders_count?.toLocaleString("id-ID")}</td>
              <td className="px-4 py-3">{u.shops_count}</td>
              <td className="px-4 py-3">{u.products_count}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{date(u.created_at)}</td>
              <td className="px-4 py-3">{u.suspended_at ? <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Nonaktif</span> : <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Aktif</span>}</td>
            </tr>
          ))}</tbody>
        </table>{data && data.total === 0 && <p className="py-14 text-center text-sm text-slate-500">Tidak ada pengguna.</p>}</div>
        {data && <Pager page={data.current_page} last={data.last_page} total={data.total} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />}
      </Panel>
      {openId && <UserDrawer id={openId} onClose={() => setOpenId(null)} onSaved={load} />}
    </div>
  );
}

function UserDrawer({ id, onClose, onSaved }: { id: number; onClose: () => void; onSaved: () => void }) {
  const [u, setU] = useState<Detail | null>(null);
  const [plan, setPlan] = useState("gratis");
  const [billing, setBilling] = useState("monthly");
  const [expires, setExpires] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fill = (d: Detail) => { setU(d); setPlan(d.plan || "gratis"); setBilling(d.plan_billing || "monthly"); setExpires(d.plan_expires_at?.slice(0, 10) ?? null); };
  useEffect(() => { setU(null); api<Detail>(`/admin/users/${id}`).then(fill); }, [id]);

  const save = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { fill(await api<Detail>(`/admin/users/${id}`, { method: "PUT", json: body })); setMsg({ ok: true, text: ok }); onSaved(); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4"><h2 className="font-bold text-navy">Detail pengguna</h2><button onClick={onClose} aria-label="Tutup" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
        {!u ? <p className="p-10 text-center text-slate-400">Memuat…</p> : (
          <div className="space-y-6 p-6">
            <div>
              <p className="text-xl font-extrabold text-navy">{u.store_name || u.name}</p>
              <p className="text-sm text-slate-500">{u.name} · {u.email}{u.whatsapp ? ` · ${u.whatsapp}` : ""}</p>
              <p className="mt-1 text-xs text-slate-400">Daftar {date(u.created_at)} · MRR {rupiah(u.mrr)}</p>
            </div>
            {msg && <p className={`rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Pesanan 30 hari", u.orders_30d.toLocaleString("id-ID")], ["GMV 30 hari", rupiah(u.gmv_30d)], ["Produk", String(u.products_count ?? 0)]].map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{l}</p><p className="font-bold text-navy">{v}</p></div>)}
            </div>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="font-bold text-navy">Paket langganan</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>{PLANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                <Select className="input" value={billing} onChange={(e) => setBilling(e.target.value)}><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option></Select>
                <DatePicker value={expires} onChange={setExpires} placeholder="Berlaku s/d" clearable />
              </div>
              <button disabled={busy} onClick={() => save({ plan, plan_billing: plan === "gratis" ? null : billing, plan_expires_at: plan === "gratis" ? null : expires }, "Paket diperbarui.")} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50">Simpan paket</button>
            </section>

            <section className="flex flex-wrap gap-2">
              {u.suspended_at
                ? <button disabled={busy} onClick={() => save({ suspended: false }, "Akun diaktifkan kembali.")} className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"><CheckCircle2 size={16} />Aktifkan akun</button>
                : <button disabled={busy} onClick={async () => (await askConfirm(`${u.store_name || u.email} tidak bisa login lagi dan semua sesinya langsung dikeluarkan.`, { title: "Nonaktifkan akun?", confirmLabel: "Nonaktifkan", danger: true })) && save({ suspended: true }, "Akun dinonaktifkan.")} className="flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50"><Ban size={16} />Nonaktifkan akun</button>}
              <button disabled={busy} onClick={async () => (await askConfirm(u.is_admin ? "Akun ini tidak bisa membuka Pesanin Console lagi." : "Admin bisa melihat dan mengubah semua akun, paket, dan pengaturan platform.", { title: u.is_admin ? "Cabut akses admin?" : "Jadikan admin Pesanin?", confirmLabel: u.is_admin ? "Cabut admin" : "Jadikan admin", danger: !!u.is_admin })) && save({ is_admin: !u.is_admin }, u.is_admin ? "Akses admin dicabut." : "Sekarang admin.")} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-navy hover:bg-slate-50"><Shield size={16} />{u.is_admin ? "Cabut admin" : "Jadikan admin"}</button>
            </section>

            <section>
              <h3 className="mb-2 font-bold text-navy">Toko & integrasi</h3>
              <div className="space-y-2">
                {u.shops.map((s) => <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm"><ShopeeMark size={22} /><span className="min-w-0 flex-1"><b className="block truncate text-navy">{s.shop_name}{s.is_demo ? " (demo)" : ""}</b><span className="text-xs text-slate-500">Shop ID {s.shop_id} · sinkron {date(s.orders_synced_at)}</span>{s.last_error && <span className="block truncate text-xs text-rose-600">{s.last_error}</span>}</span><span className="text-xs font-semibold capitalize text-slate-600">{s.status}</span></div>)}
                {u.integrations.map((i) => <div key={i.provider} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-700">{i.provider.replace("_", " ")}</span><span className="text-xs font-semibold capitalize text-slate-600">{i.status}</span></div>)}
                {!u.shops.length && !u.integrations.length && <p className="text-sm text-slate-400">Belum ada toko atau integrasi.</p>}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-bold text-navy">Tagihan</h3>
              {u.invoices.length ? <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">{u.invoices.map((i) => <div key={i.id} className="flex justify-between px-3 py-2"><span><b className="block text-navy">{i.number}</b><span className="text-xs capitalize text-slate-500">{i.plan} · {i.billing === "yearly" ? "tahunan" : "bulanan"} · {date(i.created_at)}</span></span><span className="text-right"><b className="block">{rupiah(i.total)}</b><span className="text-xs capitalize text-slate-500">{i.status}</span></span></div>)}</div> : <p className="text-sm text-slate-400">Belum ada tagihan.</p>}
            </section>

            <section>
              <h3 className="mb-2 font-bold text-navy">Aktivitas terakhir</h3>
              <ul className="space-y-1.5 text-sm">{u.activity.map((a, i) => <li key={i} className="flex justify-between gap-3"><span className="text-slate-700">{a.description}</span><span className="shrink-0 text-xs text-slate-400">{date(a.created_at)}</span></li>)}</ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return <Suspense><Users /></Suspense>;
}
