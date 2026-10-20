import { useState } from "react";
import { useParams } from "react-router-dom";
import { CompanyFrame, moneyClass } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { getBook, signedCr, type YearPoint } from "@/lib/drillData";

const tabs = ["P&L Statement", "Balance Sheet", "Cash Flow"] as const;

export function CompanyStatementsPage() {
  const { entityId = "" } = useParams();
  const book = getBook(entityId);
  const [tab, setTab] = useState<(typeof tabs)[number]>("P&L Statement");
  if (!book) return <CompanyFrame entityId={entityId} page="Statements"><p /></CompanyFrame>;
  const years = book.years;

  return (
    <CompanyFrame entityId={entityId} page="Statements">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>
            {item}
          </button>
        ))}
      </div>
      {tab === "P&L Statement" ? (
        <Panel title="P&L statement" subtitle="Figures are ₹ Cr and the total column is the sum of the years." bleed>
          <Sheet
            rows={[
              section("Income"),
              line("Rental income", years, (row) => row.rental),
              line("Sales / service revenue", years, (row) => row.sales + row.services),
              line("Other income", years, (row) => row.otherIncome),
              total("Total income", years, (row) => row.revenue),
              section("Expenses"),
              line("Employee benefits / salaries", years, (row) => row.employee),
              line("Raw materials", years, (row) => row.materials),
              line("Admin and office", years, (row) => row.admin),
              line("Marketing and advertising", years, (row) => row.marketing),
              line("Depreciation", years, (row) => row.depreciation),
              line("Interest expense", years, (row) => row.interest),
              total("Total expenses", years, (row) => row.opex + row.interest),
              profit(years),
            ]}
          />
        </Panel>
      ) : null}
      {tab === "Balance Sheet" ? (
        <Panel title="Balance sheet" bleed>
          <Sheet
            rows={[
              line("Total assets", years, (row) => row.assets),
              line("Total liabilities", years, (row) => row.liabilities),
              line("Equity", years, (row) => row.equity),
              line("Bank", years, (row) => row.bank),
              line("Current assets", years, (row) => row.currentAssets),
              line("Current liabilities", years, (row) => row.currentLiabilities),
            ]}
          />
        </Panel>
      ) : null}
      {tab === "Cash Flow" ? (
        <Panel title="Cash flow" bleed>
          <Sheet
            rows={[
              signedLine("Operating", years, (row) => row.ocf),
              signedLine("Investing", years, (row) => row.icf),
              signedLine("Financing", years, (row) => row.fcf),
              signedLine("Net change", years, (row) => row.ocf + row.icf + row.fcf),
            ]}
          />
        </Panel>
      ) : null}
    </CompanyFrame>
  );
}

function sum(years: YearPoint[], pick: (row: YearPoint) => number): number {
  return Math.round(years.reduce((total, row) => total + pick(row), 0) * 100) / 100;
}

type SheetRow = { label: string; kind: "section" | "line" | "total" | "profit"; cells: string[]; tone?: ("pos" | "neg" | "plain")[] };

function section(label: string): SheetRow {
  return { label, kind: "section", cells: ["", "", "", "", "", "", ""] };
}

function line(label: string, years: YearPoint[], pick: (row: YearPoint) => number): SheetRow {
  const values = [...years].reverse().map(pick);
  const total = sum(years, pick);
  return { label, kind: "line", cells: [...values.map((value) => inrCr(value)), inrCr(total)] };
}

function total(label: string, years: YearPoint[], pick: (row: YearPoint) => number): SheetRow {
  const row = line(label, years, pick);
  return { ...row, kind: "total" };
}

function profit(years: YearPoint[]): SheetRow {
  const values = [...years].reverse().map((row) => row.net);
  const totalValue = sum(years, (row) => row.net);
  const all = [...values, totalValue];
  return {
    label: "Net profit",
    kind: "profit",
    cells: all.map((value) => signedCr(value)),
    tone: all.map((value) => (value < 0 ? "neg" : "pos")),
  };
}

function signedLine(label: string, years: YearPoint[], pick: (row: YearPoint) => number): SheetRow {
  const values = [...years].reverse().map(pick);
  const totalValue = sum(years, pick);
  const all = [...values, totalValue];
  return {
    label,
    kind: "total",
    cells: all.map((value) => signedCr(value)),
    tone: all.map((value) => (value < 0 ? "neg" : value > 0 ? "pos" : "plain")),
  };
}

function Sheet({ rows }: { rows: SheetRow[] }) {
  const headers = ["2026 (YTD)", "2025", "2024", "2023", "2022", "2021", "Total"];
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[980px]">
        <thead className="sticky top-0">
          <tr>
            <th>Particulars</th>
            {headers.map((header) => (
              <th key={header} className="text-right">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.kind === "profit" || row.kind === "total" ? "bg-ivory" : ""}>
              <td className={row.kind === "section" ? "text-xs font-semibold uppercase tracking-[0.14em] text-navy/45" : row.kind === "line" ? "pl-8" : "font-semibold"}>
                {row.label}
              </td>
              {row.cells.map((cell, index) => (
                <td key={`${row.label}-${headers[index]}`} className={`text-right tabular-nums ${row.tone?.[index] === "neg" ? moneyClass(-1) : row.tone?.[index] === "pos" ? moneyClass(1) : ""} ${row.kind === "profit" ? "font-semibold" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
