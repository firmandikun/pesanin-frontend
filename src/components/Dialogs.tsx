"use client";
import { AlertTriangle, Info, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * In-app replacements for window.confirm / alert / prompt.
 *   if (!(await askConfirm("Hapus produk?"))) return;
 *   showAlert("Gagal menyimpan");
 *   const name = await askText("Nama template", "Template baru");
 * One <DialogHost /> in the root layout renders whichever is open.
 */
type Req =
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: "alert"; title: string; message: string; resolve: () => void }
  | { kind: "prompt"; title: string; message: string; value: string; resolve: (v: string | null) => void };

let queue: Req[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const push = (r: Req) => { queue = [...queue, r]; emit(); };
const done = () => { queue = queue.slice(1); emit(); };

/** Destructive wording picks the button label and red styling automatically. */
const ACTIONS: [RegExp, string][] = [[/^hapus\b/i, "Hapus"], [/^putuskan\b/i, "Putuskan"], [/^blokir\b/i, "Blokir"]];

export function askConfirm(message: string, opts: { title?: string; confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  const hit = ACTIONS.find(([re]) => re.test(message));
  return new Promise((resolve) => push({
    kind: "confirm", message, resolve,
    title: opts.title ?? (hit ? `${hit[1]}?` : "Konfirmasi"),
    confirmLabel: opts.confirmLabel ?? hit?.[1] ?? "Ya, lanjutkan",
    danger: opts.danger ?? !!hit,
  }));
}

export function showAlert(message: string, title = "Informasi"): Promise<void> {
  return new Promise((resolve) => push({ kind: "alert", title, message, resolve }));
}

export function askText(title: string, value = "", message = ""): Promise<string | null> {
  return new Promise((resolve) => push({ kind: "prompt", title, message, value, resolve }));
}

export function DialogHost() {
  const current = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => queue[0] ?? null,
    () => null,
  );
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const ok = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current) return;
    if (current.kind === "prompt") { setText(current.value); setTimeout(() => input.current?.select(), 0); } else setTimeout(() => ok.current?.focus(), 0);
  }, [current]);

  if (!current) return null;
  const cancel = () => {
    if (current.kind === "confirm") current.resolve(false);
    else if (current.kind === "prompt") current.resolve(null);
    else current.resolve();
    done();
  };
  const accept = () => {
    if (current.kind === "confirm") current.resolve(true);
    else if (current.kind === "prompt") current.resolve(text);
    else current.resolve();
    done();
  };
  const danger = current.kind === "confirm" && current.danger;
  const Icon = danger ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/40 p-4 pt-[18vh]" onClick={cancel}
      onKeyDown={(e) => { if (e.key === "Escape") cancel(); }} role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => { e.preventDefault(); accept(); }}>
          <div className="flex gap-3 p-5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"}`}><Icon size={20} /></span>
            <div className="min-w-0 flex-1 pt-1">
              <h3 id="dlg-title" className="font-bold text-navy">{current.title}</h3>
              {current.message && <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{current.message}</p>}
              {current.kind === "prompt" && <input ref={input} className="input mt-3 h-10" value={text} onChange={(e) => setText(e.target.value)} />}
            </div>
            <button type="button" onClick={cancel} className="self-start text-slate-400 hover:text-slate-700" aria-label="Tutup"><X size={18} /></button>
          </div>
          <div className="flex justify-end gap-2 rounded-b-2xl bg-slate-50 px-5 py-3">
            {current.kind !== "alert" && <button type="button" onClick={cancel} className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-200/60">Batal</button>}
            <button ref={ok} className={`h-10 min-w-24 rounded-lg px-5 text-sm font-semibold text-white ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"}`}>
              {current.kind === "confirm" ? current.confirmLabel : current.kind === "prompt" ? "Simpan" : "OK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
