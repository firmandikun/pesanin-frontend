"use client";
import { CheckCircle2, Info, Paperclip } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { API_URL, getToken } from "@/lib/api";
import { showAlert } from "@/components/Dialogs";

const TINTS = {
  violet: "bg-violet-100 text-violet-600", orange: "bg-orange-100 text-orange-500", blue: "bg-blue-100 text-blue-600",
  green: "bg-emerald-100 text-emerald-600", pink: "bg-pink-100 text-pink-500", sky: "bg-sky-100 text-sky-600",
  red: "bg-rose-100 text-rose-600", indigo: "bg-brand-100 text-brand-600", teal: "bg-teal-100 text-teal-600",
};
export type Tint = keyof typeof TINTS;

/** Section card styled like the reference editor: tinted round icon, bold title, divider. */
export function EdCard({ icon: Icon, tint = "blue", title, desc, right, children, flush }: {
  icon: LucideIcon; tint?: Tint; title: string; desc?: string; right?: React.ReactNode; children?: React.ReactNode; flush?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className={`flex items-center gap-3 px-4 py-3.5 ${children && !flush ? "mx-0 border-b border-slate-100" : ""}`}>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TINTS[tint]}`}><Icon size={15} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
          {desc && <p className="text-xs text-slate-500">{desc}</p>}
        </div>
        {right}
      </div>
      {children && <div className="space-y-4 p-4">{children}</div>}
    </section>
  );
}

export function ChoiceCard({ active, label, desc, onClick }: { active: boolean; label: string; desc?: string; onClick: () => void }) {
  return (
    <div>
      <button type="button" onClick={onClick}
        className={`relative w-full rounded-lg border py-2.5 text-sm font-medium transition ${active ? "border-brand-600 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
        {label}
        {active && <CheckCircle2 size={16} className="absolute -top-2 right-3 rounded-full bg-white fill-emerald-500 text-white" />}
      </button>
      {desc && <p className="mt-2 px-2 text-center text-xs text-slate-500">{desc}</p>}
    </div>
  );
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${disabled ? "text-slate-400" : "font-medium text-slate-700"}`}>
      <input type="checkbox" disabled={disabled} className="h-4 w-4 rounded accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${checked ? "bg-brand-600" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** Row with icon + title/desc + switch (Keamanan, Header toggles, …). */
export function SwitchRow({ icon: Icon, iconCls = "text-blue-600", title, desc, checked, onChange, boxed, disabled }: {
  icon: LucideIcon; iconCls?: string; title: string; desc?: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; boxed?: boolean; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${boxed ? "rounded-lg bg-slate-50 px-3 py-2.5" : ""}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${boxed ? "bg-blue-50" : ""} ${iconCls}`}><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        {desc && <div className="text-xs text-slate-500">{desc}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Note({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "blue" }) {
  return (
    <p className={`flex items-start gap-2 text-xs ${tone === "amber" ? "text-slate-600" : "rounded-lg border border-slate-200 px-3 py-2 font-medium text-blue-700"}`}>
      <Info size={15} className={`mt-px shrink-0 ${tone === "amber" ? "fill-amber-400 text-white" : "fill-blue-600 text-white"}`} />{children}
    </p>
  );
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-slate-700">
      {children}{hint && <span title={hint}><Info size={13} className="text-slate-400" /></span>}
    </label>
  );
}

export function RpInput({ value, onChange }: { value?: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">Rp</span>
      <input className="h-10 w-full px-3 text-sm outline-none" inputMode="numeric" placeholder="0"
        value={value == null ? "" : Number(value).toLocaleString("id-ID")}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); onChange(d === "" ? null : Number(d)); }} />
    </div>
  );
}

export async function uploadFiles(files: FileList | File[]): Promise<string[]> {
  const fd = new FormData();
  Array.from(files).slice(0, 10).forEach((f) => fd.append("files[]", f));
  const res = await fetch(`${API_URL}/uploads`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Upload gagal");
  return data.urls;
}

export function Dropzone({ label, hint, multiple, onUploaded, compact }: { label: string; hint?: string; multiple?: boolean; onUploaded: (urls: string[]) => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try { onUploaded(await uploadFiles(files)); } catch (e) { showAlert((e as Error).message, "Gagal mengunggah"); } finally { setBusy(false); }
  };
  return (
    <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm transition ${compact ? "py-6" : "py-9"} ${over ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"}`}>
      <span className="flex items-center gap-2 font-medium text-slate-700"><Paperclip size={16} />{busy ? "Mengunggah…" : label}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
      <input type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => handle(e.target.files)} />
    </label>
  );
}
