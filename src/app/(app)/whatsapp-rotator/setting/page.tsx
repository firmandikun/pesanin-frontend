"use client";
import { Check, Clock, Monitor, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CardTitle, FieldLabel, PageHead, Panel } from "@/components/kit";
import { DEFAULT_ROTATOR } from "@/components/kit/rotator";
import { Loader } from "@/components/kit/Loader";
import { Select } from "@/components/Select";

const COLORS = ["#e53935", "#26c6da", "#1e2a4a", "#f48fb1"];
const TYPES = ["spinner", "dots-ring", "ring", "dots"] as const;

export default function RotatorSettings() {
  const [s, setS] = useState<any>(DEFAULT_ROTATOR);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api("/user-settings").then((x) => setS({ ...DEFAULT_ROTATOR, ...(x.rotator ?? {}) })); }, []);
  const save = async (patch: any) => {
    const next = { ...s, ...patch }; setS(next);
    await api("/user-settings", { method: "PUT", json: { key: "rotator", value: next } });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="space-y-5">
      <PageHead title="Settings Global">{saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check size={15} />Tersimpan</span>}</PageHead>
      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Panel>
          <CardTitle icon={Monitor} title="Rotator Loading (Default)" tint="blue" />
          <div className="space-y-4 p-5">
            {([["text_redirect", "Teks Ketika Redirect", "Tulisan ini akan muncul di loading page sebelum visitor diarahkan ke WhatsApp."],
              ["text_unavailable", "Teks Ketika Tidak Ada Yang Available", "Tulisan ini akan muncul di loading page jika TIDAK ADA satupun CS yang aktif dan WhatsApp CS default belum diisi."],
              ["text_button", "Teks Tombol", "Tulisan ini akan muncul di button WhatsApp di loading page."],
              ["fallback_phone", "WhatsApp CS Default", "Dipakai jika tidak ada staf yang sedang bertugas."]] as const).map(([k, l, h]) => (
              <div key={k}><FieldLabel>{l}</FieldLabel><input className="input" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} onBlur={() => save({})} /><p className="mt-1 text-xs text-slate-500">{h}</p></div>
            ))}
            <div className="grid gap-4 md:grid-cols-[1fr_200px]">
              <div className="space-y-4">
                <div><FieldLabel>Loading Color</FieldLabel>
                  <div className="flex items-center gap-2">{COLORS.map((c) => <button key={c} onClick={() => save({ loading_color: c })} className={`h-8 w-8 rounded-full ${s.loading_color === c ? "ring-2 ring-brand-600 ring-offset-2" : ""}`} style={{ background: c }} aria-label={c} />)}
                    <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}><input type="color" className="absolute inset-0 opacity-0" value={s.loading_color} onChange={(e) => save({ loading_color: e.target.value })} /></label></div></div>
                <div><FieldLabel>Loading Type</FieldLabel>
                  <div className="flex gap-2">{TYPES.map((t) => <button key={t} onClick={() => save({ loading_type: t })} className={`relative flex h-12 w-12 items-center justify-center rounded-lg border ${s.loading_type === t ? "border-brand-600" : "border-slate-200"}`}><Loader type={t} color={s.loading_color} size={24} /></button>)}</div></div>
              </div>
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50"><Loader type={s.loading_type} color={s.loading_color} size={44} /></div>
            </div>
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel>
            <CardTitle icon={Clock} title="Rotator Delay Time (Default)" tint="violet" />
            <div className="p-5"><Select className="input" value={s.delay} onChange={(e) => save({ delay: Number(e.target.value) })}>{[0, 1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n} Detik</option>)}</Select></div>
          </Panel>
          <Panel>
            <CardTitle icon={RefreshCw} title="WhatsApp Method" tint="sky" />
            <div className="divide-y divide-slate-100 px-5 py-2">
              {([["api", "WhatsApp API Link", "https://api.whatsapp.com/send?phone=62812xx"], ["deeplink", "WhatsApp Deep Link", "whatsapp://send?phone=62812xx"]] as const).map(([v, t, d]) => (
                <label key={v} className="flex cursor-pointer items-start gap-3 py-3"><input type="radio" className="mt-1 h-4 w-4 accent-brand-600" checked={s.method === v} onChange={() => save({ method: v })} />
                  <span><b className="block text-sm text-slate-800">{t}</b><span className="text-xs text-slate-500">{d}</span></span></label>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
