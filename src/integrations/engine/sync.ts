export type Schedule = "manual" | "daily" | "weekly" | "monthly";

export const scheduleDays: Record<Schedule, number | null> = { manual: null, daily: 1, weekly: 7, monthly: 31 };

export interface Freshness {
  state: "never" | "fresh" | "due" | "stale";
  label: string;
  ageDays: number | null;
  expectedEveryDays: number;
}

export function freshness(lastImportAt: string | null, schedule: Schedule, freshnessDays: number, now = new Date()): Freshness {
  const expected = scheduleDays[schedule] ?? freshnessDays;
  if (!lastImportAt) return { state: "never", label: "No data yet", ageDays: null, expectedEveryDays: expected };
  const ageDays = Math.max(0, (now.getTime() - new Date(lastImportAt).getTime()) / 86_400_000);
  const rounded = Math.round(ageDays * 10) / 10;
  if (ageDays <= expected) return { state: "fresh", label: `Fresh · ${rounded} day(s) old`, ageDays: rounded, expectedEveryDays: expected };
  if (ageDays <= expected * 2) return { state: "due", label: `Update due · ${rounded} day(s) old`, ageDays: rounded, expectedEveryDays: expected };
  return { state: "stale", label: `Stale · ${rounded} day(s) old`, ageDays: rounded, expectedEveryDays: expected };
}

export function nextRun(lastImportAt: string | null, schedule: Schedule): string | null {
  const days = scheduleDays[schedule];
  if (!days) return null;
  const base = lastImportAt ? new Date(lastImportAt) : new Date();
  return new Date(base.getTime() + days * 86_400_000).toISOString();
}
