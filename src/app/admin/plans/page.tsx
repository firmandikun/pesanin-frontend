"use client";

import { Infinity as Unlimited, Lock, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api, ApiError, rupiah } from "@/lib/api";

type Limits = Record<string, number | null>;
type Plan = { id: string; name: string; monthly: number; limits: Limits; default: { name: string; monthly: number; limits: Limits } };
type Platform = { plans: Plan[]; limit_labels: Record<string, string>; features: { key: string; label: string; plan: string; default: string }[] };

const TONE: Record<string, string> = { gratis: "border-slate-300", starter: "border-sky-400", bisnis: "border-indigo-500", pro: "border-violet-500" };

/** Console → Paket & Fitur: prices, quotas and which plan unlocks each feature. Applies to billing, quota checks and the pricing table. */
export default function PlansAdmin() {
  const [data, setData] = useState<Platform | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fill = (d: Platform) => { setData(d); setPlans(d.plans); setFeatures(Object.fromEntries(d.features.map((f) => [f.key, f.plan]))); };
  useEffect(() => { api<Platform>("/admin/platform").then(fill); }, []);

  const setPlan = (id: string, patch: Partial<Plan>) => setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const setLimit = (id: string, k: string, v: number | null) => setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, limits: { ...p.limits, [k]: v } } : p)));

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const body = { plans: Object.fromEntries(plans.map((p) => [p.id, { name: p.name, monthly: p.monthly, limits: p.limits }])), features };
      fill(await api<Platform>("/admin/platform", { method: "PUT", json: body }));
      setMsg({ ok: true, text: "Tersimpan. Harga, kuota, dan akses fitur baru langsung berlaku untuk semua seller." });
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal menyimpan" }); }
    finally { setSaving(false); }
  };

  if (!data) return <p className="py-24 text-center text-slate-400">Memuat paket…</p>;
  const order = data.plans.map((p) => p.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Paket & Fitur</h1><p className="text-sm text-slate-500">Atur harga, kuota, dan fitur tiap paket langganan Pesanin. Berlaku untuk tagihan baru, batas kuota, dan tabel harga di website.</p></div>
        <button onClick={save} disabled={saving} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? "Menyimpan…" : "Simpan perubahan"}</button>
      </div>
      {msg && <p className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <Panel key={p.id} className={`border-t-4 p-5 ${TONE[p.id]}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{p.id}</p>
            <input className="input mt-1 h-10 font-bold" value={p.name} onChange={(e) => setPlan(p.id, { name: e.target.value })} />
            <label className="mt-3 block text-xs font-semibold text-slate-500">Harga per bulan
              <div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
                <input type="number" min={0} disabled={p.id === "gratis"} className="input h-10 pl-10 disabled:bg-slate-50" value={p.monthly} onChange={(e) => setPlan(p.id, { monthly: Number(e.target.value) })} /></div>
            </label>
            <p className="mt-2 text-xs text-slate-500">Tahunan {rupiah(p.monthly * 10)} (bayar 10 bulan)</p>
            {(p.monthly !== p.default.monthly || p.name !== p.default.name) && <button onClick={() => setPlan(p.id, { name: p.default.name, monthly: p.default.monthly })} className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600"><RotateCcw size={12} />Kembalikan default ({rupiah(p.default.monthly)})</button>}
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Kuota per paket</h2><p className="text-xs text-slate-500">Kosongkan atau klik ∞ untuk tanpa batas.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Kuota</th>{plans.map((p) => <th key={p.id} className="px-3 py-3">{p.name}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(data.limit_labels).map(([k, label]) => (
              <tr key={k}>
                <td className="px-5 py-2.5 font-medium capitalize text-slate-700">{label}</td>
                {plans.map((p) => {
                  const v = p.limits[k];
                  return (
                    <td key={p.id} className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} placeholder="∞" className={`input h-9 w-28 ${v !== p.default.limits[k] ? "border-indigo-300 bg-indigo-50/50" : ""}`} value={v ?? ""} onChange={(e) => setLimit(p.id, k, e.target.value === "" ? null : Number(e.target.value))} />
                        <button onClick={() => setLimit(p.id, k, null)} title="Tanpa batas" className={`rounded-md p-1.5 ${v === null ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:bg-slate-100"}`}><Unlimited size={14} /></button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table></div>
      </Panel>

      <Panel className="p-5">
        <h2 className="font-bold text-slate-900">Akses fitur</h2>
        <p className="text-xs text-slate-500">Paket minimum yang membuka setiap fitur. Seller di bawah paket ini melihat ajakan upgrade.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.features.map((f) => (
            <div key={f.key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Lock size={16} /></span>
              <div className="flex-1"><b className="block text-sm text-slate-900">{f.label}</b><span className="text-xs text-slate-500">Default: {plans.find((p) => p.id === f.default)?.name}</span></div>
              <Select className="input h-9 w-36" value={features[f.key]} onChange={(e) => setFeatures({ ...features, [f.key]: e.target.value })}>
                {order.map((id) => <option key={id} value={id}>Mulai {plans.find((p) => p.id === id)?.name}</option>)}
              </Select>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
