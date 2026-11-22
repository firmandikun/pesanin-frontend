"use client";
import { ErrorScreen } from "@/components/ErrorScreen";
import "./globals.css";

/** Errors in the root layout itself (replaces the whole page, so it brings its own <html>). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body className="bg-slate-50">
        <ErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}
