import { useSyncExternalStore } from "react";
import { bookYears, getBookYear, setBookYear, subscribeBookYear } from "@/lib/propertyBook";

export function BookYearSelect() {
  const year = useSyncExternalStore(subscribeBookYear, getBookYear, getBookYear);

  return (
    <label className="inline-flex items-center gap-2 text-sm text-navy/70">
      Fiscal year
      <select
        value={year}
        onChange={(event) => setBookYear(event.target.value as (typeof bookYears)[number])}
        className="rounded-full border border-navy/15 bg-white px-3 py-1.5 text-sm font-semibold text-navy"
      >
        {bookYears.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
