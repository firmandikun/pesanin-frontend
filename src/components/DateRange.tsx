"use client";
import { DateRangePicker, todayRange } from "./DatePicker";

/** Every date filter starts on today. */
export function useDefaultRange() {
  return todayRange();
}

export function DateRange({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  return <DateRangePicker value={value} onChange={onChange} />;
}
