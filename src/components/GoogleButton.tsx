"use client";
import { useEffect, useRef, useState } from "react";

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
let loader: Promise<void> | null = null;
const loadGsi = () => (loader ??= new Promise<void>((resolve, reject) => {
  const s = Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true, defer: true });
  s.onload = () => resolve();
  s.onerror = () => { loader = null; reject(new Error("gsi")); };
  document.head.appendChild(s);
}));

/** Google's own "Lanjutkan dengan Google" button (Google Identity Services). Hidden when no client id is configured. */
export function GoogleButton({ text, onCredential, disabled }: { text: "signin_with" | "signup_with" | "continue_with"; onCredential: (credential: string) => void; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let alive = true;
    loadGsi().then(() => {
      if (!alive || !box.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => cb.current(r.credential) });
      window.google.accounts.id.renderButton(box.current, {
        type: "standard", theme: "outline", size: "large", shape: "rectangular", text, logo_alignment: "center", locale: "id",
        width: Math.min(400, Math.max(200, box.current.offsetWidth)),
      });
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [text]);

  if (!CLIENT_ID || failed) return null;
  return <div ref={box} className={`flex h-11 w-full justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`} />;
}

export const googleEnabled = !!CLIENT_ID;
