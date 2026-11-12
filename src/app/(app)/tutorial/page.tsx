"use client";
import { TutorialLibrary } from "@/components/marketing/TutorialLibrary";

export default function Tutorial() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[34px] font-bold text-slate-800">Tutorial</h1>
        <p className="text-slate-500">Video dan panduan langkah demi langkah memakai Pesanin.</p>
      </div>
      <TutorialLibrary compact />
    </div>
  );
}
