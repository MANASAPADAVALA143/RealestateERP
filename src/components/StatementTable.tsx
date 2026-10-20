import { useSyncExternalStore } from "react";
import {
  getBookYear,
  statementYearIndex,
  statementYears,
  subscribeBookYear,
  type StatementRow,
} from "@/lib/propertyBook";

function toneClass(tone?: "pos" | "neg"): string {
  if (tone === "pos") return "text-emerald-700";
  if (tone === "neg") return "text-red-700";
  return "";
}

export function StatementTable({ rows }: { rows: StatementRow[] }) {
  const year = useSyncExternalStore(subscribeBookYear, getBookYear, getBookYear);
  const active = statementYearIndex(year);

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[760px]">
        <thead>
          <tr>
            <th>Line</th>
            {statementYears.map((label, index) => (
              <th key={label} className={`text-right ${index === active ? "bg-gold/30 text-navy" : ""}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.kind === "total" ? "bg-ivory" : row.kind === "subtotal" ? "bg-navy/[0.03]" : ""}>
              <td className={`${row.kind === "line" ? "pl-8" : ""} ${row.kind === "group" ? "text-xs font-semibold uppercase tracking-[0.14em] text-navy/45" : ""} ${row.kind === "total" || row.kind === "subtotal" ? "font-semibold" : ""}`}>
                {row.label}
              </td>
              {row.values.map((cell, index) => (
                <td
                  key={`${row.label}-${statementYears[index]}`}
                  className={`text-right tabular-nums ${toneClass(cell.tone)} ${row.kind === "total" || row.kind === "subtotal" ? "font-semibold" : ""} ${index === active ? "bg-gold/15" : ""}`}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
