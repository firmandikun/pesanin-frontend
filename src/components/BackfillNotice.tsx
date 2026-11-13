"use client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * A report endpoint returns `backfilling: true` when the chosen date range reaches earlier than the Shopee shops
 * have synced, so Pesanin is pulling that older range in the background. Show a notice and reload the report a few
 * times until the numbers catch up.
 */
export function useBackfillReload(backfilling: boolean | undefined, reload: () => void) {
  const tries = useRef(0);
  useEffect(() => {
    if (!backfilling) { tries.current = 0; return; }
    if (tries.current >= 8) return; // stop after ~1.5 min; user can refresh manually
    tries.current += 1;
    const t = setTimeout(reload, 11000);
    return () => clearTimeout(t);
  }, [backfilling, reload]);
}

export function BackfillNotice({ show }: { show: boolean | undefined }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
      <Loader2 size={16} className="shrink-0 animate-spin" />
      Menyinkronkan data Shopee untuk periode ini… angka akan diperbarui otomatis.
    </div>
  );
}
