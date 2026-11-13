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
  if (checking) return <p className="py-24 text-center text-sm text-slate-400">Memuat…</p>;
  return <AuthForm mode="login" />;
}
