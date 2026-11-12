import { API_URL } from "./api";

/** Public content managed from the admin dashboard (tutorials, blog, announcements). */
export type Tutorial = {
  id: number; slug: string; title: string; category: "pemula" | "analitik" | "lanjutan"; description: string;
  video_url: string | null; duration: string | null; steps: string[] | null; views: number; created_at: string;
};
export type BlogPost = { slug: string; title: string; category: string; excerpt: string; cover_url: string | null; published_at: string; minutes: number; body?: string };
export type Announcement = { id: number; tag: "NEW" | "UPDATE" | "INFO"; title: string; body: string; published_at: string };

export const TUTORIAL_CATEGORIES = { pemula: "Pemula", analitik: "Analitik", lanjutan: "Lanjutan" } as const;

export async function publicApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/public${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** YouTube video id from watch / youtu.be / shorts / embed links. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

export const isNew = (iso: string, days = 30) => Date.now() - new Date(iso).getTime() < days * 864e5;
