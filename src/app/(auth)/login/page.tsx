"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm, landingFor } from "@/components/AuthForm";
import { api, getToken } from "@/lib/api";
import type { User } from "@/lib/auth";

/** Already signed in (e.g. coming back from Shopee in a new tab): go straight to the app instead of the form. */
export default function Page() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!getToken()) return setChecking(false);
    api<User>("/me").then((u) => router.replace(landingFor(u))).catch(() => setChecking(false));
  }, [router]);
  if (checking) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-[#ee4d2d]/20 border-t-[#ee4d2d]" />
      <p className="text-xs font-medium text-slate-500">Memeriksa sesi login…</p>
    </div>
  );
  return <AuthForm mode="login" />;
}
