"use client";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type TelegramState = { connected: boolean; bot_username: string | null; bot_name?: string | null; chat_name: string | null; ready: boolean };
const NONE: TelegramState = { connected: false, bot_username: null, chat_name: null, ready: false };

/**
 * The seller's own Telegram bot (token from @BotFather): connect, detect the chat, send a test, disconnect.
 * One connection is used for everything: daily profit summary, alerts and the scheduled AWB PDFs.
 * Shown in Pengaturan → Notifikasi and Pengaturan → Otomatisasi Pesanan.
 */
export function TelegramConnect({ onChange }: { onChange?: (tg: TelegramState) => void }) {
  const [tg, setTgState] = useState<TelegramState | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const setTg = (t: TelegramState) => { setTgState(t); onChange?.(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { api<TelegramState>("/telegram").then(setTg).catch(() => setTg(NONE)); }, []);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key); setNote(null);
    try { const t = await fn(); if (t) setNote({ ok: true, text: t }); }
    catch (e) { setNote({ ok: false, text: e instanceof ApiError ? e.message : "Gagal" }); }
    finally { setBusy(""); }
  };
  const spin = (k: string) => busy === k && <Loader2 size={14} className="animate-spin" />;
  const btn = "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50";

  if (!tg) return <p className="text-xs text-slate-400">Memuat Telegram…</p>;
  return (
    <div className="space-y-2">
      {!tg.connected ? (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          <b className="block text-slate-700">Hubungkan bot Telegram</b>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-600">
            <li>Di Telegram buka <b>@BotFather</b>, kirim <code>/newbot</code>, beri nama bot.</li>
            <li>Salin <b>token</b> yang diberikan BotFather, tempel di bawah, klik Hubungkan.</li>
            <li>Buka bot barumu, tekan <b>Start</b>, lalu klik <b>Deteksi chat</b>. Mau ke grup? Tambahkan bot ke grup dan kirim <code>/start</code> di sana.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <input className="input min-w-0 flex-1 bg-white font-mono text-xs" placeholder="123456789:AAH…" aria-label="Token bot Telegram" value={token} onChange={(e) => setToken(e.target.value.trim())} />
            <button className={btn} disabled={!token || !!busy} onClick={() => run("save", async () => { const r = await api<TelegramState>("/telegram", { method: "PUT", json: { bot_token: token } }); setTg(r); setToken(""); return r.ready ? "Terhubung." : `Bot @${r.bot_username} tersimpan. Tekan Start di bot, lalu klik Deteksi chat.`; })}>{spin("save")}Hubungkan</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="mr-auto text-slate-700">Bot <b>{tg.bot_name ? `${tg.bot_name} ` : ""}(@{tg.bot_username})</b>{tg.ready ? <> · kirim ke <b>{tg.chat_name}</b></> : <span className="text-amber-700"> · chat belum terdeteksi</span>}</span>
          {!tg.ready && tg.bot_username && <a href={`https://t.me/${tg.bot_username}`} target="_blank" rel="noopener noreferrer" className={btn}><Send size={14} />Buka bot di Telegram</a>}
          {!tg.ready && <button className={btn} disabled={!!busy} onClick={() => run("detect", async () => { setTg(await api<TelegramState>("/telegram/detect", { method: "POST" })); return "Chat terdeteksi."; })}>{spin("detect")}Deteksi chat</button>}
          {tg.ready && <button className={btn} disabled={!!busy} onClick={() => run("test", async () => { await api("/telegram/test", { method: "POST" }); return "Pesan tes terkirim, cek Telegram."; })}>{spin("test")}Kirim tes</button>}
          <button className="text-xs font-semibold text-slate-500 hover:text-rose-600" disabled={!!busy} onClick={() => run("del", async () => { await api("/telegram", { method: "DELETE" }); setTg(NONE); })}>Putuskan</button>
        </div>
      )}
      {note && <p className={`rounded-lg p-2.5 text-sm ${note.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{note.text}</p>}
    </div>
  );
}
