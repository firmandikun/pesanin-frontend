"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** Old address: chat moved to its own menu at /chat. Keeps bookmarks and old notification links working. */
function Redirect() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const q = new URLSearchParams({ channel: "shopee", ...(sp.get("shop") ? { source: sp.get("shop")! } : {}), ...(sp.get("c") ? { c: sp.get("c")! } : {}) });
    router.replace(`/chat?${q}`);
  }, [router, sp]);
  return null;
}

export default function OldChatPage() {
  return <Suspense fallback={null}><Redirect /></Suspense>;
}
