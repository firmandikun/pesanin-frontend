/* Shared bits of the landing page (Figma "Pesanin" → Beranda). Safe to import from server and client components. */

/** Section container: 1232px content inside the 1440px frame (104px side padding), narrower padding below xl. */
export const WRAP = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-[104px]";

/** Pesanin wordmark, cropped from the exported artwork exactly like the Figma layer. */
export function Wordmark({ className = "h-[24px] w-[102px]" }: { className?: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/wordmark.png" alt="Pesanin" className="absolute left-[-17.06%] top-[-85.85%] h-[285.21%] w-[133.89%] max-w-none" />
    </span>
  );
}
