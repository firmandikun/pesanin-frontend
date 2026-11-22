"use client";
import { ErrorScreen } from "@/components/ErrorScreen";

/** Errors inside the dashboard pages: the sidebar stays, the page shows the error (or reloads after a deploy). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} />;
}
