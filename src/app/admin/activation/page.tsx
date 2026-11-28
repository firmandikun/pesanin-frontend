"use client";

import { MessageCircle, Rocket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/kit";
import { Select } from "@/components/Select";
import { api } from "@/lib/api";

type Report = {
  days: number; track: "marketplace" | "social"; signups: number; complete: number;
  funnel: { key: string; title: string; users: number }[];
  stuck: { id: number; name: string; store_name: string | null; email: string; whatsapp: string | null; created_at: string; days: number; done: number; next: string; next_title: string }[];
};

/** 08xx / +62 / 62 → 62xxx for wa.me. */
const waNumber = (n: string) => { const d = n.replace(/\D/g, ""); return d.startsWith("0") ? `62${d.slice(1)}` : d; };

/**
 * Aktivasi seller baru: how many sellers who signed up recently reached each checklist step
 * (App\Support\Activation, same steps as the seller dashboard), and who stopped where, to contact them.
 */
export default function ActivationPage() {
  const [days, setDays] = useState("30");
  const [track, setTrack] = useState<"marketplace" | "social">("marketplace");
  const [r, setR] = useState<Report | null>(null);

  useEffect(() => {
    setR(null);
    api<Report>(`/admin/activation?days=${days}&track=${track}`).then(setR).catch(() => setR(null));
  }, [days, track]);

  const total = Math.max(1, r?.signups ?? 0);
  const steps = r?.funnel ?? [];
  const stepCount = steps.length;
  const message = (s: Report["stuck"][number]) =>
    `Halo ${s.name}, saya dari Pesanin. Terima kasih sudah daftar! Saya lihat langkah "${s.next_title}" belum selesai. Ada yang bisa saya bantu supaya tokomu bisa langsung lihat laba bersihnya?`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Rocket size={22} className="text-indigo-500" />Aktivasi seller baru</h1>
          <p className="text-sm text-slate-500">Berapa seller baru yang menyelesaikan tiap langkah awal (checklist di dashboard seller), dan siapa yang berhenti di tengah.</p>
        </div>
        <div className="flex gap-2">
          <Select className="input h-9 w-44" value={track} onChange={(e) => setTrack(e.target.value as "marketplace" | "social")}>
            <option value="marketplace">Jalur Marketplace</option>
            <option value="social">Jalur Social & Web</option>
          </Select>
          <Select className="input h-9 w-36" value={days} onChange={(e) => setDays(e.target.value)}>
            {["7", "14", "30", "90"].map((d) => <option key={d} value={d}>{d} hari terakhir</option>)}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Seller daftar</p><p className="mt-1 text-2xl font-bold text-slate-900">{r?.signups ?? "…"}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Selesai semua langkah</p><p className="mt-1 text-2xl font-bold text-emerald-600">{r ? `${r.complete} (${Math.round((r.complete / total) * 100)}%)` : "…"}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-medium text-slate-500">Berhenti di tengah</p><p className="mt-1 text-2xl font-bold text-amber-600">{r?.stuck.length ?? "…"}</p></Panel>
      </div>

      <Panel className="p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Funnel langkah awal</h2>
        {!r ? <p className="text-sm text-slate-400">Memuat…</p> : !r.signups ? <p className="text-sm text-slate-500">Belum ada seller baru di jalur ini pada periode ini.</p> : (
          <div className="space-y-2.5">
            {steps.map((s, i) => {
              const pct = Math.round((s.users / total) * 100);
              const drop = i > 0 ? steps[i - 1].users - s.users : r.signups - s.users;
              return (
                <div key={s.key} className="grid grid-cols-[minmax(0,220px)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-slate-700">{i + 1}. {s.title}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></span>
                  <span className="w-36 text-right tabular-nums text-slate-600"><b className="text-slate-900">{s.users}</b> · {pct}%{drop > 0 && <span className="ml-1 text-xs text-amber-600">(−{drop})</span>}</span>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-slate-500">(−n) = jumlah seller yang berhenti dibanding langkah sebelumnya. Langkah dengan penurunan terbesar adalah yang paling perlu dipermudah.</p>
          </div>
        )}
      </Panel>

      <Panel>
        <div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Seller yang berhenti di tengah</h2>
          <p className="text-sm text-slate-500">Hubungi langsung untuk membantu, terutama yang baru daftar beberapa hari. Seller juga otomatis mendapat pengingat langkah berikutnya (jam 10.00, 2 minggu pertama).</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100">
              <th className="px-5 py-2.5 font-semibold">Seller</th><th className="px-3 font-semibold">Daftar</th><th className="px-3 font-semibold">Progres</th><th className="px-3 font-semibold">Berhenti di</th><th className="px-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {r?.stuck.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3"><Link href={`/admin/users?open=${s.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{s.store_name || s.name}</Link><span className="block text-xs text-slate-400">{s.email}</span></td>
                  <td className="px-3 text-slate-600">{s.days === 0 ? "hari ini" : `${s.days} hari lalu`}</td>
                  <td className="px-3 text-slate-600">{s.done}/{stepCount}</td>
                  <td className="px-3"><span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{s.next_title}</span></td>
                  <td className="px-3 text-right">{s.whatsapp
                    ? <a href={`https://wa.me/${waNumber(s.whatsapp)}?text=${encodeURIComponent(message(s))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><MessageCircle size={13} />Hubungi WA</a>
                    : <span className="text-xs text-slate-400">tanpa WA</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r && !r.stuck.length && <p className="py-8 text-center text-sm text-slate-500">Tidak ada seller yang tertahan. 🎉</p>}
        </div>
      </Panel>
    </div>
  );
}
