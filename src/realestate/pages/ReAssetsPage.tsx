import { useState } from "react";
import { Search } from "lucide-react";
import { Card, DemoButton, Kpi, Progress, RePage, StatusPill, Toggle } from "@/realestate/ui";
import { balance, properties, usd, usdSigned } from "@/realestate/data";

export function ReAssetsPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = properties.filter((row) => !q || `${row.name} property non-current`.toLowerCase().includes(q));

  return (
    <RePage page="Assets Detail" title="Assets" right={<Toggle options={["Yearly", "Quarterly"]} />}>
      <section className="grid gap-3 lg:grid-cols-3">
        <Kpi label="Total asset value" value={usd(balance.assets)} hint="No prior period comparison · 2026 Balance Sheet">
          <Progress pct={100} />
        </Kpi>
        <Kpi label="Non-current assets" value={usd(balance.nonCurrentAssets)} />
        <Kpi label="Current assets" value={usd(balance.currentAssets)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Needs attention">
          <p className="rounded-xl border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm">
            1 property with no debt recorded — Verify building name matches in Loans & Notes.
          </p>
        </Card>
        <Card title="Asset insights">
          <ul className="space-y-2 text-sm">
            <li>Largest: Non-current Assets — <b>$4,778,000</b> — 100.0% of Balance Sheet assets</li>
            <li>Portfolio grew vs 2025 — <b className="text-emerald-700">+$4,778,000</b></li>
          </ul>
        </Card>
      </section>

      <Card
        title="Asset register"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill text="2 assets" tone="grey" />
            <DemoButton>Import</DemoButton>
            <DemoButton>Export</DemoButton>
            <DemoButton primary>+ New Asset</DemoButton>
          </div>
        }
      >
        <label className="relative mb-3 block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search asset, property or category..."
            className="w-full rounded-xl border border-navy/15 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <div className="mb-3">
          <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-ivory">Non-current Assets ({rows.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1080px]">
            <thead>
              <tr>
                <th>Asset / property</th>
                <th className="text-right">Purchase price</th>
                <th className="text-right">Market value</th>
                <th className="text-right">Book value</th>
                <th className="text-right">Debt</th>
                <th className="text-right">Interest (ann.)</th>
                <th className="text-right">Unrealised P&L</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.name}</td>
                  <td className="text-right tabular-nums">{usd(row.cost)}</td>
                  <td className="text-right tabular-nums text-blue-700">{usd(row.market)}</td>
                  <td className="text-right tabular-nums">{usd(row.book)}</td>
                  <td className="text-right tabular-nums">
                    {row.debt ? (
                      <>
                        <span className="text-blue-700">{usd(row.debt)}</span>
                        <p className="text-xs text-navy/50">{row.lender}</p>
                      </>
                    ) : "—"}
                  </td>
                  <td className="text-right tabular-nums">{row.interest ?? "—"}</td>
                  <td className="text-right tabular-nums text-blue-700">{usdSigned(row.gain)}</td>
                  <td><DemoButton>Edit</DemoButton></td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-navy/50">No assets match that search.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </RePage>
  );
}
