"use client";
import { useEffect } from "react";

const RELOAD_KEY = "pesanin_chunk_reload";

/** After a deploy an open tab still points at the old JavaScript files: that error is fixed by loading the page again. */
export const isChunkError = (e: { name?: string; message?: string } | null | undefined) =>
  !!e && (e.name === "ChunkLoadError" || /Loading (CSS )?chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(e.message ?? ""));

/**
 * Shown instead of Next.js' blank "Application error". A stale-deploy error reloads the page once by itself; any other
 * error shows its message (so it can be reported) with buttons to retry or reload.
 */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  const chunk = isChunkError(error);
  useEffect(() => {
    console.error(error);
    if (!chunk) return;
    try {
      // Reload once per minute at most, so a real outage does not loop.
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        location.reload();
      }
    } catch { location.reload(); }
  }, [error, chunk]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-lg font-bold text-slate-800">{chunk ? "Pesanin baru saja diperbarui" : "Halaman ini mengalami error"}</p>
        <p className="mt-1 text-sm text-slate-500">{chunk ? "Memuat versi terbaru…" : "Coba lagi. Kalau masih muncul, kirim pesan di bawah ini ke tim Pesanin."}</p>
        {!chunk && (
          <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-left text-xs text-rose-700">
            {error.message || String(error)}{error.digest ? `\n(kode: ${error.digest})` : ""}{typeof window !== "undefined" ? `\n${location.pathname}` : ""}
          </pre>
        )}
        <div className="mt-4 flex justify-center gap-2">
          {reset && !chunk && <button onClick={reset} className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Coba lagi</button>}
          <button onClick={() => location.reload()} className="h-10 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700">Muat ulang halaman</button>
        </div>
      </div>
    </div>
  );
}
