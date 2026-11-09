"use client";
import { isoDate } from "@/lib/api";
import { DateRangePicker } from "./DatePicker";

export function useDefaultRange() {
  return { from: isoDate(new Date(Date.now() - 29 * 864e5)), to: isoDate(new Date()) };
}

export function DateRange({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  return <DateRangePicker value={value} onChange={onChange} />;
}
