import { useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { BookYearSelect } from "@/components/BookYearSelect";
import { StatementTable } from "@/components/StatementTable";
import { Lede, Panel } from "@/components/ui";
import type { Insight } from "@/lib/demoData";
import { balanceSheet, cashFlow, profitAndLoss, propertyBookName, type StatementRow } from "@/lib/propertyBook";

const tabs: { id: "pl" | "bs" | "cf"; label: string; title: string; rows: StatementRow[] }[] = [
  { id: "pl", label: "Profit & Loss", title: "Profit & Loss", rows: profitAndLoss },
  { id: "bs", label: "Balance Sheet", title: "Balance Sheet", rows: balanceSheet },
  { id: "cf", label: "Cash Flow", title: "Cash Flow", rows: cashFlow },
];

const insights: Insight[] = [
  {
    title: "FY26 is the first profit year",
    body: "Net income on this partnership book is +₹0.9 Cr in FY26. FY22 through FY25 are printed as losses.",
  },
  {
    title: "Read the printed totals",
    body: "The subtotals and totals are the figures from the source statements. Show those lines as printed.",
  },
  {
    title: "Both sides close at ₹49.4 Cr",
    body: "FY26 total assets and total liabilities and equity are both ₹49.4 Cr on the balance sheet.",
  },
  {
    title: "The year column follows the selector",
    body: "FY2024, FY2025, and FY2026 highlight the matching column. The same year drives the Financial Snapshot.",
  },
];

export function StatementsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("pl");
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Lede>
          Financial statements for {propertyBookName}, in ₹ Cr. This is the partnership book, separate from the group consolidation.
        </Lede>
        <BookYearSelect />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.id ? "bg-navy text-ivory" : "bg-white text-navy ring-1 ring-inset ring-navy/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel title={active.title} subtitle="₹ Cr" bleed>
        <StatementTable rows={active.rows} />
      </Panel>

      <AiInsights page="Financial Statements" insights={insights} />
    </div>
  );
}
