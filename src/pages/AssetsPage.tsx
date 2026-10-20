import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import {
  balanceSheet,
  entityById,
  group,
  inrCr,
  insights,
  investments,
  signedInr,
  signedPct,
} from "@/lib/demoData";

export function AssetsPage() {
  const invested = investments.reduce((sum, item) => sum + item.invested, 0);
  const current = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const gain = investments.reduce((sum, item) => sum + item.unrealizedGL, 0);
  const income = investments.reduce((sum, item) => sum + item.dividends, 0);

  const totals = balanceSheet.reduce(
    (sum, line) => {
      const entity = entityById(line.entityId);
      return {
        cash: sum.cash + entity.cash,
        receivables: sum.receivables + line.receivables,
        inventory: sum.inventory + line.inventory,
        investments: sum.investments + line.investments,
        fixedAssets: sum.fixedAssets + line.fixedAssets,
        borrowings: sum.borrowings + entity.debt,
        equity: sum.equity + entity.equity,
      };
    },
    { cash: 0, receivables: 0, inventory: 0, investments: 0, fixedAssets: 0, borrowings: 0, equity: 0 },
  );

  return (
    <div className="space-y-6">
      <Lede>
        Group balance sheet by entity, plus the listed treasury book. Balance-sheet investments include unlisted
        promoter stakes that are outside the seven-line portfolio below.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total assets" value={inrCr(group.assets)} hint="Six entities, fully consolidated" />
        <KpiCard label="Treasury book" value={inrCr(current)} hint={`Cost ${inrCr(invested)}`} accent="gold" />
        <KpiCard label="Unrealized gain" value={signedInr(gain)} hint="Price return on the treasury book" accent="gold" />
        <KpiCard label="Distributions" value={inrCr(income)} hint="Dividends, coupons, and FD interest" />
      </section>

      <Panel
        title="Group balance sheet"
        subtitle="Each entity foots: borrowings plus equity equals total assets. Inventory at LBH is land."
        bleed
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1080px]">
            <thead>
              <tr>
                <th>Entity</th>
                <th className="text-right">Cash</th>
                <th className="text-right">Receivables</th>
                <th className="text-right">Inventory</th>
                <th className="text-right">Investments</th>
                <th className="text-right">Fixed assets</th>
                <th className="text-right">Total assets</th>
                <th className="text-right">Borrowings</th>
                <th className="text-right">Equity</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheet.map((line) => {
                const entity = entityById(line.entityId);
                return (
                  <tr key={line.entityId}>
                    <td>
                      <p className="font-semibold">{entity.code}</p>
                      <p className="text-xs text-navy/55">{entity.name}</p>
                    </td>
                    <td className="text-right tabular-nums">{inrCr(entity.cash)}</td>
                    <td className="text-right tabular-nums">{inrCr(line.receivables)}</td>
                    <td className="text-right tabular-nums">{inrCr(line.inventory)}</td>
                    <td className="text-right tabular-nums">{inrCr(line.investments)}</td>
                    <td className="text-right tabular-nums">{inrCr(line.fixedAssets)}</td>
                    <td className="text-right font-medium tabular-nums">{inrCr(entity.assets)}</td>
                    <td className="text-right tabular-nums">{inrCr(entity.debt)}</td>
                    <td className="text-right tabular-nums">{inrCr(entity.equity)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Group</td>
                <td className="text-right tabular-nums">{inrCr(totals.cash)}</td>
                <td className="text-right tabular-nums">{inrCr(totals.receivables)}</td>
                <td className="text-right tabular-nums">{inrCr(totals.inventory)}</td>
                <td className="text-right tabular-nums">{inrCr(totals.investments)}</td>
                <td className="text-right tabular-nums">{inrCr(totals.fixedAssets)}</td>
                <td className="text-right tabular-nums">{inrCr(group.assets)}</td>
                <td className="text-right tabular-nums">{inrCr(totals.borrowings)}</td>
                <td className="text-right tabular-nums">{inrCr(totals.equity)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Panel
        title="Investment portfolio"
        subtitle="Seven positions. ROI is unrealized price return. Distributions are shown separately."
        bleed
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Sector</th>
                <th>Holder</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Current value</th>
                <th className="text-right">Unrealized G/L</th>
                <th className="text-right">ROI</th>
                <th className="text-right">Dividends</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.type}</td>
                  <td className="text-navy/70">{item.sector}</td>
                  <td className="font-semibold">{item.entityId}</td>
                  <td className="text-right tabular-nums">{inrCr(item.invested)}</td>
                  <td className="text-right tabular-nums">{inrCr(item.currentValue)}</td>
                  <td
                    className={`text-right tabular-nums ${item.unrealizedGL < 0 ? "text-red-700" : "text-emerald-800"}`}
                  >
                    {signedInr(item.unrealizedGL)}
                  </td>
                  <td className={`text-right tabular-nums ${item.roi < 0 ? "text-red-700" : "text-emerald-800"}`}>
                    {signedPct(item.roi)}
                  </td>
                  <td className="text-right tabular-nums">{inrCr(item.dividends)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Treasury book</td>
                <td className="text-right tabular-nums">{inrCr(invested)}</td>
                <td className="text-right tabular-nums">{inrCr(current)}</td>
                <td className="text-right tabular-nums">{signedInr(gain)}</td>
                <td />
                <td className="text-right tabular-nums">{inrCr(income)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <AiInsights page="Assets" insights={insights.Assets} />
    </div>
  );
}
