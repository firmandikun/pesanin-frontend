"use client";
import { AlertTriangle, Info, Loader2, MapPin, Store, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/kit";
import { Select } from "@/components/Select";
import { cleanCourier } from "@/lib/courier";
import { api, ApiError } from "@/lib/api";

type Method = "pickup" | "dropoff" | "non_integrated";
type Option = {
  id: number; code: string; courier: string | null; shop: string; methods: Method[]; needs: Partial<Record<Method, string[]>>;
  slots: { id: string; date: number | null; text: string | null }[]; address: string | null;
  branches: { id: number; name: string }[]; slugs: { id: string; name: string }[]; error: string | null;
};
type Choice = { method: Method; slot: string; branch: string; slug: string; sender: string; tracking: string };

const slotLabel = (s: Option["slots"][number]) =>
  s.text || (s.date ? new Date(s.date * 1000).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" }) : s.id);
const METHOD: Record<Method, { icon: typeof Truck; title: string; desc: string }> = {
  pickup: { icon: Truck, title: "Pickup", desc: "Kurir menjemput paket ke alamat toko" },
  dropoff: { icon: Store, title: "Drop-off", desc: "Antar paket ke counter/agen ekspedisi" },
  non_integrated: { icon: Store, title: "Kirim sendiri", desc: "Pakai ekspedisi lain, isi nomor resinya" },
};

/**
 * "Atur pengiriman" for one or many Shopee orders. Shopee decides per courier (and per shop setting)
 * whether pickup, drop-off or both are allowed, so orders are grouped by shop + courier and each
 * group gets only the methods it supports: pickup is preferred, otherwise drop-off.
 */
export function ShipModal({ orderIds, onClose, onDone }: { orderIds: number[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [opts, setOpts] = useState<Option[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, Option[]>();
    (opts ?? []).filter((o) => !o.error && o.methods.length).forEach((o) => {
      const k = `${o.shop}|${o.courier}`;
      map.set(k, [...(map.get(k) ?? []), o]);
    });
    return [...map.entries()].map(([key, orders]) => ({
      key, orders, first: orders[0],
      // A method is offered only when every order in the group supports it.
      methods: (["pickup", "dropoff", "non_integrated"] as Method[]).filter((m) => orders.every((o) => o.methods.includes(m))),
    }));
  }, [opts]);

  useEffect(() => {
    api<{ orders: Option[]; sender_name: string }>(`/labels/shopee/options?ids=${orderIds.join(",")}`).then((d) => {
      setOpts(d.orders);
      const init: Record<string, Choice> = {};
      d.orders.filter((o) => !o.error && o.methods.length).forEach((o) => {
        const k = `${o.shop}|${o.courier}`;
        if (init[k]) return;
        const method: Method = o.methods.includes("pickup") ? "pickup" : o.methods.includes("dropoff") ? "dropoff" : o.methods[0];
        init[k] = { method, slot: o.slots[0]?.id ?? "", branch: o.branches[0] ? String(o.branches[0].id) : "", slug: o.slugs[0]?.id ?? "", sender: d.sender_name ?? "", tracking: "" };
      });
      setChoices(init);
    }).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat opsi pengiriman"));
  }, [orderIds]);

  const set = (k: string, patch: Partial<Choice>) => setChoices((c) => ({ ...c, [k]: { ...c[k], ...patch } }));
  const skipped = (opts ?? []).filter((o) => o.error || !o.methods.length);
  const count = groups.reduce((n, g) => n + g.orders.length, 0);
  const needs = (g: (typeof groups)[number], f: string) => g.orders.some((o) => (o.needs[choices[g.key]?.method] ?? []).includes(f));
  const missing = groups.some((g) => {
    const c = choices[g.key];
    if (!c || !g.methods.includes(c.method)) return true;
    if (c.method !== "pickup" && (needs(g, "tracking_no") || needs(g, "tracking_number")) && g.orders.length === 1 && !c.tracking.trim()) return true;
    return c.method === "dropoff" && needs(g, "sender_real_name") && !c.sender.trim();
  });

  async function submit() {
    setBusy(true); setErr("");
    try {
      const items = groups.flatMap((g) => {
        const c = choices[g.key];
        return g.orders.map((o) => ({
          order_id: o.id, method: c.method,
          pickup_time_id: c.method === "pickup" ? c.slot || null : null,
          branch_id: c.method === "dropoff" && c.branch ? Number(c.branch) : null,
          slug: c.method === "dropoff" ? c.slug || null : null,
          sender_real_name: c.method === "dropoff" ? c.sender.trim() || null : null,
          tracking_number: c.method !== "pickup" ? c.tracking.trim() || null : null,
        }));
      });
      const r = await api("/labels/shopee/ship", { method: "POST", json: { items } });
      onDone(`${r.shipped.length} pesanan diatur pengirimannya${r.failed.length ? `, ${r.failed.length} gagal: ${r.failed.map((f: any) => `${f.code} (${f.error})`).join("; ")}` : ""}. Nomor resi terbit dalam beberapa detik, lalu resi bisa dicetak.`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal mengatur pengiriman"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog title={orderIds.length > 1 ? `Atur pengiriman · ${orderIds.length} pesanan` : "Atur pengiriman"} icon={Truck} onClose={onClose} width="max-w-xl">
      {!opts && !err && <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Mengecek opsi pengiriman di Shopee…</p>}
      {opts && (
        <div className="max-h-[62vh] space-y-3 overflow-y-auto">
          {groups.map((g) => {
            const c = choices[g.key];
            if (!c) return null;
            const only = g.methods.length === 1;
            return (
              <section key={g.key} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy">{cleanCourier(g.first.courier)}</p>
                    <p className="text-xs text-slate-500">{g.orders.length} pesanan · {g.first.shop}</p>
                  </div>
                  {only && <span className="whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">Hanya {METHOD[g.methods[0]].title.toLowerCase()}</span>}
                </div>

                {g.methods.length > 1 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {g.methods.map((m) => {
                      const M = METHOD[m]; const on = c.method === m;
                      return (
                        <button key={m} type="button" onClick={() => set(g.key, { method: m })}
                          className={`flex items-center gap-2.5 rounded-lg p-3 text-left ring-2 transition ${on ? "bg-white ring-brand-500" : "bg-white/60 ring-transparent hover:bg-white"}`}>
                          <M.icon size={18} className={on ? "text-brand-600" : "text-slate-400"} />
                          <span><b className="block text-sm text-navy">{M.title}</b><span className="text-xs text-slate-500">{M.desc}</span></span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 flex gap-2 text-xs text-slate-500"><Info size={14} className="mt-px shrink-0" />
                    {c.method === "dropoff" ? "Shopee tidak menyediakan penjemputan untuk ekspedisi/toko ini. Antar paket ke counter terdekat setelah resi dicetak." : c.method === "pickup" ? "Ekspedisi ini hanya melayani penjemputan oleh kurir." : METHOD[c.method].desc}
                  </p>
                )}

                <div className="mt-3 space-y-2 text-sm">
                  {c.method === "pickup" && (
                    <>
                      {g.first.address && <p className="flex gap-2 text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />{g.first.address}</p>}
                      {g.first.slots.length > 0 && (
                        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Waktu penjemputan</span>
                          <Select className="input h-10 bg-white" value={c.slot} onChange={(e) => set(g.key, { slot: e.target.value })}>
                            {g.first.slots.map((s) => <option key={s.id} value={s.id}>{slotLabel(s)}</option>)}
                          </Select>
                        </label>
                      )}
                    </>
                  )}
                  {c.method === "dropoff" && (
                    <>
                      {g.methods.length > 1 && <p className="flex gap-2 text-xs text-slate-500"><Store size={14} className="mt-px shrink-0" />Setelah resi dicetak, antar paket ke counter {cleanCourier(g.first.courier)} terdekat.</p>}
                      {needs(g, "branch_id") && g.first.branches.length > 0 && (
                        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Counter drop-off</span>
                          <Select className="input h-10 bg-white" value={c.branch} onChange={(e) => set(g.key, { branch: e.target.value })}>
                            {g.first.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </Select>
                        </label>
                      )}
                      {needs(g, "slug") && g.first.slugs.length > 0 && (
                        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Jenis drop-off</span>
                          <Select className="input h-10 bg-white" value={c.slug} onChange={(e) => set(g.key, { slug: e.target.value })}>
                            {g.first.slugs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </Select>
                        </label>
                      )}
                      {needs(g, "sender_real_name") && (
                        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Nama pengirim (sesuai KTP saat di counter)</span>
                          <input className="input h-10 bg-white" value={c.sender} onChange={(e) => set(g.key, { sender: e.target.value })} />
                        </label>
                      )}
                    </>
                  )}
                  {c.method !== "pickup" && (needs(g, "tracking_no") || needs(g, "tracking_number")) && (
                    g.orders.length === 1 ? (
                      <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Nomor resi dari ekspedisi</span>
                        <input className="input h-10 bg-white font-mono" value={c.tracking} onChange={(e) => set(g.key, { tracking: e.target.value })} placeholder="Contoh: JP1234567890" />
                      </label>
                    ) : <p className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800"><AlertTriangle size={14} className="mt-px shrink-0" />Ekspedisi ini meminta nomor resi per pesanan. Atur pesanan ini satu per satu.</p>
                  )}
                </div>
              </section>
            );
          })}
          {skipped.length > 0 && (
            <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">{skipped.length} pesanan dilewati: {skipped.map((o) => `${o.code} (${o.error ?? "tidak ada metode pengiriman"})`).join("; ")}</p>
          )}
        </div>
      )}
      {err && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{err}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button onClick={onClose} className="h-10 rounded-lg bg-slate-100 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-200">Batal</button>
        <button onClick={submit} disabled={busy || !count || missing} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />}Atur pengiriman{count > 1 ? ` (${count})` : ""}
        </button>
      </div>
    </Dialog>
  );
}
