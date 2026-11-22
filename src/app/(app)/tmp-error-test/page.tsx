"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
// Temporary page to check the error screen (deleted after testing).
function Boom() {
  const chunk = useSearchParams().get("chunk");
  const e = new Error(chunk ? "Loading chunk 123 failed." : "Cannot read properties of undefined (reading 'label')");
  if (chunk) e.name = "ChunkLoadError";
  throw e;
}
export default function Page() { return <Suspense><Boom /></Suspense>; }
