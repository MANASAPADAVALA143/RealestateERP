import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import type { Insight } from "@/lib/demoData";
import {
  assetKpis,
  holdingTotals,
  holdings,
  propertyBookName,
  propertyCards,
  propertyLoans,
} from "@/lib/propertyBook";

const insights: Insight[] = [
  {
    title: "This book sits inside ARL",
    body: "RP & SK Investments – II LP is the property partnership. It is not added again on top of the ₹234.00 Cr group consolidation.",
  },
  {
    title: "Cost and market are both printed",
    body: "Capital in and cost basis are ₹33.6 Cr. Market value is ₹47.4 Cr, so the unrealised gain on the page is +₹13.9 Cr.",
  },
  {
    title: "Suite 112 is the soft occupancy",
    body: "26875 US380 Suite 112 is 60% occupied. The other four properties on this book are full.",
  },
  {
    title: "Punjabway LTV is the printed 42.0%",
    body: "The Axis note shows 42.0% LTV. Read that figure as given on the loan card.",
  },
];

export function OwnershipPage() {
  const maxMarket = Math.max(...holdings.map((row) => row.marketValue));
  const maxRoi = Math.max(...holdings.map((row) => row.roiValue));
  const maxLoan = Math.max(...propertyLoans.map((row) => row.outstandingValue));

  return (
    <div className="space-y-6">
      <Lede>
        Ownership detail for {propertyBookName}. Every property is held through ARL. The group Assets page is the ₹893 Cr consolidation, and this page is the partnership book.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {assetKpis.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} hint="Partnership book, FY26" accent={item.label === "Non-current" ? "gold" : "navy"} />
        ))}
      </section>

      <Panel title="Ownership detail" subtitle={propertyBookName} bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Property</th>
                <th>Entity</th>
                <th>Own%</th>
                <th className="text-right">Capital in</th>
                <th className="text-right">Cost basis</th>
                <th className="text-right">Market value</th>
                <th className="text-right">Unrealised G/L</th>
                <th className="text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((row) => (
                <tr key={row.property}>
                  <td>{propertyBookName}</td>
                  <td className="font-medium">{row.property}</td>
                  <td>{row.entity}</td>
                  <td>{row.own}</td>
                  <td className="text-right tabular-nums">{row.capital}</td>
                  <td className="text-right tabular-nums">{row.cost}</td>
                  <td className="text-right tabular-nums">{row.market}</td>
                  <td className="text-right tabular-nums text-emerald-700">{row.gl}</td>
                  <td className="text-right tabular-nums">{row.roi}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Portfolio total</td>
                <td className="text-right tabular-nums">{holdingTotals.capital}</td>
                <td className="text-right tabular-nums">{holdingTotals.cost}</td>
                <td className="text-right tabular-nums">{holdingTotals.market}</td>
                <td className="text-right tabular-nums text-emerald-700">{holdingTotals.gl}</td>
                <td className="text-right tabular-nums">{holdingTotals.roi}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Market value vs cost basis" subtitle="Navy is market value. Gold is cost basis.">
          <ul className="space-y-4">
            {holdings.map((row) => (
              <li key={row.property}>
                <p className="mb-1 text-sm font-medium text-navy">{row.property}</p>
                <div className="space-y-1">
                  <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${(row.marketValue / (maxMarket * 1.08)) * 100}%` }} />
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(row.costValue / (maxMarket * 1.08)) * 100}%` }} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-navy/55">
                  {row.market} market · {row.cost} cost
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="ROI by property" subtitle="Return on the printed cost basis.">
          <ul className="space-y-3">
            {holdings.map((row) => (
              <li key={row.property} className="grid items-center gap-3 sm:grid-cols-[1fr_8rem]">
                <div>
                  <p className="text-sm font-medium text-navy">{row.property}</p>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-navy/5">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${(row.roiValue / (maxRoi * 1.08)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{row.roi}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Properties" subtitle="Cost, market, rent, and occupancy from the HTML assets section.">
        <div className="grid gap-4 lg:grid-cols-2">
          {propertyCards.map((card) => (
            <article key={card.name} className="rounded-xl border border-navy/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">{card.name}</h3>
                  <p className="text-xs text-navy/55">{card.place}</p>
                </div>
                <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-semibold text-navy">ARL</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs text-navy/50">Cost basis</dt><dd className="font-semibold tabular-nums">{card.cost}</dd></div>
                <div><dt className="text-xs text-navy/50">Market value</dt><dd className="font-semibold tabular-nums">{card.market}</dd></div>
                <div><dt className="text-xs text-navy/50">G/L</dt><dd className="font-semibold tabular-nums text-emerald-700">{card.gl}</dd></div>
                <div><dt className="text-xs text-navy/50">Monthly rent</dt><dd className="font-semibold tabular-nums">{card.rent}</dd></div>
                <div><dt className="text-xs text-navy/50">Occupancy</dt><dd className="font-semibold tabular-nums">{card.occupancy}%</dd></div>
                <div><dt className="text-xs text-navy/50">ROI</dt><dd className="font-semibold tabular-nums">{card.roi}</dd></div>
              </dl>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/5" aria-label={`Occupancy ${card.occupancy} percent`}>
                <div className="h-full rounded-full" style={{ width: `${card.occupancy}%`, backgroundColor: card.occupancy < 100 ? "#C79A2B" : "#0B1D33" }} />
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Loans & Notes" subtitle="The four property notes. Outstanding is the drawn balance.">
        <div className="grid gap-4 lg:grid-cols-2">
          {propertyLoans.map((loan) => (
            <article key={loan.lender} className="rounded-xl border border-navy/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">{loan.property}</h3>
                  <p className="text-xs text-navy/55">{loan.lender}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-700/15">Active</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{loan.outstanding} of {loan.sanctioned}</span>
                <b>{loan.drawn}%</b>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy/5">
                <div className="h-full rounded-full bg-navy" style={{ width: `${loan.drawn}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs text-navy/50">EMI/month</dt><dd className="font-semibold">{loan.emi}</dd></div>
                <div><dt className="text-xs text-navy/50">Rate</dt><dd className="font-semibold">{loan.rate}</dd></div>
                <div><dt className="text-xs text-navy/50">LTV</dt><dd className="font-semibold">{loan.ltv}</dd></div>
                <div><dt className="text-xs text-navy/50">Maturity</dt><dd className="font-semibold">{loan.maturity}</dd></div>
                <div><dt className="text-xs text-navy/50">Int paid YTD</dt><dd className="font-semibold">{loan.interestYtd}</dd></div>
                <div><dt className="text-xs text-navy/50">Type</dt><dd className="font-semibold">{loan.type}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <ul className="mt-6 space-y-3">
          {propertyLoans.map((loan) => (
            <li key={loan.property} className="grid items-center gap-3 sm:grid-cols-[12rem_1fr_5.5rem]">
              <span className="text-sm font-medium text-navy">{loan.property}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                <div className="h-full rounded-full bg-navy" style={{ width: `${(loan.outstandingValue / (maxLoan * 1.08)) * 100}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{loan.outstanding}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <AiInsights page="Ownership" insights={insights} />
    </div>
  );
}
