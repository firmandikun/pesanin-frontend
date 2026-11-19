"use client";
import { useEffect, useState } from "react";
import { contactLink, loadSiteConfig, SITE } from "@/lib/site";

export type Contact = { whatsapp: string; email: string; instagram: string; tiktok: string };

/** Pesanin's contact details as set in Console → Pengaturan Platform. */
export function useContact(): Contact & { wa: (text?: string) => string } {
  const [c, setC] = useState<Contact>(SITE);
  useEffect(() => {
    loadSiteConfig().then((s) => s && setC({ whatsapp: s.whatsapp || "", email: s.email || SITE.email, instagram: s.instagram || "", tiktok: s.tiktok || "" }));
  }, []);
  return { ...c, wa: (text?: string) => contactLink(c, text) };
}

/** "Chat WhatsApp" link to Pesanin (falls back to email when no number is set); usable from server pages. */
export function WaLink({ text, children, ...rest }: { text?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const c = useContact();
  return <a href={c.wa(text)} {...rest}>{children}</a>;
}
