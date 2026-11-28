"use client";
import { Check, Copy, Loader2, Search, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead, Panel } from "@/components/kit";
import { RegionSelect } from "@/components/RegionSelect";
import { Select } from "@/components/Select";
import { api, ApiError, type Region, rupiah } from "@/lib/api";

type Address = { id: number; label: string; name: string; is_default: boolean; region?: Region | null };
type Rate = { code: string; courier: string; name: string; service: string; cost: number; etd: string; cod: boolean };
type Result = { origin: string; destination: string; weight: number; rates: Rate[]; error: string | null };

/**
 * Cek Ongkir: rates of every courier from the seller's warehouse (or any city) to a destination, so CS can answer
 * "ongkir ke X berapa kak?" without making a test order. Same rates as the Pesanin checkout.
 */
export default function CekOngkirPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [origin, setOrigin] = useState("");           // address id, or "other"
  const [originRegion, setOriginRegion] = useState<Region | null>(null);
  const [dest, setDest] = useState<Region | null>(null);
  const [kg, setKg] = useState("1");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [only, setOnly] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Address[]>("/addresses").then((a) => {
      const withRegion = a.filter((x) => x.region);
      setAddresses(withRegion);
      setOrigin(withRegion[0] ? String(withRegion[0].id) : "other");
    }).catch(() => { setAddresses([]); setOrigin("other"); });
  }, []);

  const grams = Math.round(Number(kg.replace(",", ".")) * 1000);
  const ready = !!dest && grams > 0 && (origin !== "other" || !!originRegion);

  const check = async () => {
    if (!ready) return;
    setBusy(true); setErr(""); setOnly([]); setCopied(false);
    try {
      setRes(await api<Result>("/shipping/check", { method: "POST", json: {
        region_id: dest!.id, weight: grams, value: value ? Number(value) : undefined,
        ...(origin === "other" ? { origin_region_id: originRegion!.id } : { address_id: Number(origin) }),
      } }));
    } catch (e) {
      setRes(null);
      setErr(e instanceof ApiError ? Object.values(e.errors ?? {}).flat()[0] ?? e.message : "Ongkir belum bisa dicek.");
    } finally { setBusy(false); }
  };

  const couriers = useMemo(() => [...new Set((res?.rates ?? []).map((r) => r.name))], [res]);
  const rates = (res?.rates ?? []).filter((r) => !only.length || only.includes(r.name));
  const cheapest = rates.length ? Math.min(...rates.map((r) => r.cost)) : 0;

  // Ready-to-paste answer for the buyer's chat.
  const copy = async () => {
    if (!res) return;
    const text = [`Ongkir ke ${res.destination} (${(res.weight / 1000).toLocaleString("id-ID")} kg):`,
      ...rates.slice(0, 8).map((r) => `• ${r.name} ${r.service}: ${rupiah(r.cost)} (${r.etd})`)].join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="space-y-5">
      <PageHead title="Cek Ongkir" tutorial={false} crumbs={[["Pesanan"], ["Cek Ongkir"]]} />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Panel className="space-y-4 p-5">
          <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Asal pengiriman <span className="text-rose-500">*</span></span>
            {addresses === null ? <div className="input flex items-center text-slate-400"><Loader2 size={14} className="animate-spin" /></div> : (
              <Select className="input w-full" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} ({a.region?.district}, {a.region?.city})</option>)}
                <option value="other">Kota lain…</option>
              </Select>
            )}
          </label>
          {origin === "other" && <RegionSelect value={originRegion?.id} label={originRegion?.label} onChange={setOriginRegion} placeholder="Cari kota / kecamatan asal" />}
          {addresses?.length === 0 && <p className="-mt-2 text-xs text-slate-500">Simpan alamat gudang di <Link href="/settings/addresses" className="text-brand-600 underline">Alamat Pickup</Link> agar tidak perlu dicari tiap kali.</p>}

          <div className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Tujuan pengiriman <span className="text-rose-500">*</span></span>
            <RegionSelect value={dest?.id} label={dest?.label} onChange={setDest} placeholder="Cari kota / kecamatan tujuan" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Berat (kg) <span className="text-rose-500">*</span></span>
              <input className="input w-full text-right" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, ""))} /></label>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Nilai barang (Rp)</span>
              <input className="input w-full text-right" inputMode="numeric" placeholder="opsional" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} /></label>
          </div>

          <button onClick={check} disabled={!ready || busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}Cek Ongkir
          </button>
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </Panel>

        <Panel>
          {!res ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-slate-500"><Truck size={28} className="text-slate-300" />Pilih asal, tujuan dan berat, lalu klik Cek Ongkir.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
                <p className="mr-auto min-w-0 text-sm text-slate-600"><b className="text-navy">{res.origin}</b> → <b className="text-navy">{res.destination}</b> · {(res.weight / 1000).toLocaleString("id-ID")} kg</p>
                {rates.length > 0 && <button onClick={copy} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}{copied ? "Tersalin" : "Salin untuk chat"}</button>}
              </div>
              {couriers.length > 1 && (
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-3">
                  {couriers.map((c) => (
                    <button key={c} onClick={() => setOnly(only.includes(c) ? only.filter((x) => x !== c) : [...only, c])}
                      className={`h-7 rounded-full border px-3 text-xs font-medium ${only.includes(c) ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{c}</button>
                  ))}
                </div>
              )}
              {res.error && !res.rates.length ? <p className="p-8 text-center text-sm text-slate-500">{res.error}</p> : (
                <div className="divide-y divide-slate-100">
                  {rates.map((r) => (
                    <div key={r.code} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy">{r.name} <span className="font-normal text-slate-500">{r.service}</span></p>
                        <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px]">
                          {r.cost === cheapest && <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">Termurah</span>}
                          {r.cod && <span className="rounded bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700">Bisa COD</span>}
                        </div>
                      </div>
                      <div className="text-right"><p className="font-bold text-navy">{rupiah(r.cost)}</p><p className="text-xs text-slate-500">{r.etd}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
