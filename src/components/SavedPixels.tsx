"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type SavedPixel = { id: number; platform: string; pixel_id: string; name?: string | null; all_pages: boolean };

let cache: Promise<SavedPixel[]> | null = null;

/** Pixels saved in Pengaturan → Tracking, for the "pilih pixel tersimpan" suggestions in editors. */
export function useSavedPixels(): SavedPixel[] {
  const [list, setList] = useState<SavedPixel[]>([]);
  useEffect(() => {
    cache ??= api<{ data: SavedPixel[] }>("/r/pixels?per_page=100").then((r) => r.data ?? []).catch(() => { cache = null; return []; });
    cache.then(setList);
  }, []);
  return list;
}

/** <datalist> of saved pixels for one platform; attach to an input with list={id}. */
export function SavedPixelOptions({ id, platform, pixels }: { id: string; platform: string; pixels: SavedPixel[] }) {
  return (
    <datalist id={id}>
      {pixels.filter((p) => p.platform === platform).map((p) => (
        <option key={p.id} value={p.pixel_id}>{`${p.name || "Pixel"}${p.all_pages ? " · sudah otomatis di semua halaman" : ""}`}</option>
      ))}
    </datalist>
  );
}

/** Name of a saved pixel (to auto-fill "Pixel Name" when one is picked). */
export const savedPixelName = (pixels: SavedPixel[], platform: string, pixelId: string) =>
  pixels.find((p) => p.platform === platform && p.pixel_id === pixelId)?.name ?? undefined;
