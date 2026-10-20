import { useParams } from "react-router-dom";
import { Attention, CompanyFrame, moneyClass, useSort } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { getBook, signedCr, type PartnerRow } from "@/lib/drillData";

export function CompanyOwnershipPage() {
  const { entityId = "" } = useParams();
  const book = getBook(entityId);
  const { sorted, toggle } = useSort<PartnerRow>(book?.partners ?? []);
  if (!book) return <CompanyFrame entityId={entityId} page="Ownership"><p /></CompanyFrame>;
  const largest = [...book.partners].sort((a, b) => b.own - a.own)[0];
  const best = [...book.properties].sort((a, b) => b.roi - a.roi)[0];
  const debt = book.entity.debt;
  const equity = Math.max(book.capitalInvested - debt, 0);

  return (
    <CompanyFrame entityId={entityId} page="Ownership">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Portfolio market value", inrCr(book.investmentValue)],
          ["Portfolio equity", inrCr(equity)],
          ["Total partners", String(book.partners.length)],
          ["Properties", String(book.properties.length)],
          ["Portfolio cost basis", inrCr(book.capitalInvested)],
          ["Portfolio ROI", `${book.capitalInvested === 0 ? "0.0" : ((book.investmentReturn / book.capitalInvested) * 100).toFixed(1)}%`],
          ["Largest property stake", largest?.partner ?? "—"],
          ["Portfolio LTV", `${book.ltv.toFixed(1)}%`],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-navy/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{label}</p>
            <p className="mt-2 font-serif text-2xl text-navy">{value}</p>
          </article>
        ))}
      </section>
      <Panel title="Needs attention">
        <Attention
          items={largest && largest.own > 50 ? [{ text: `${largest.partner} holds ${largest.own}% of this book`, value: "Concentration" }] : [{ text: "No partner is above a 50% stake" }]}
        />
      </Panel>
      <Panel title="Portfolio insights">
        <ul className="space-y-2 text-sm">
          <li>Best performing property: {best ? `${best.property} at ${best.roi.toFixed(1)}% ROI` : "—"}</li>
          <li>{largest && largest.own > 50 ? "Concentration risk: one partner is above half the book." : "Stakes are spread across the family register."}</li>
        </ul>
      </Panel>
      <Panel title="Partners" bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th><button type="button" onClick={() => toggle("partner")}>Partner</button></th>
                <th>Property</th>
                <th className="text-right"><button type="button" onClick={() => toggle("own")}>Own%</button></th>
                <th className="text-right">Cost basis</th>
                <th className="text-right">Market value</th>
                <th className="text-right">Unrealized G/L</th>
                <th className="text-right">ROI</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.partner}>
                  <td className="font-medium">{row.partner}</td>
                  <td>{row.property}</td>
                  <td className="text-right tabular-nums">{row.own.toFixed(0)}%</td>
                  <td className="text-right tabular-nums">{inrCr(row.cost)}</td>
                  <td className="text-right tabular-nums">{inrCr(row.market)}</td>
                  <td className={`text-right tabular-nums ${moneyClass(row.gl)}`}>{signedCr(row.gl)}</td>
                  <td className="text-right tabular-nums">{row.roi.toFixed(1)}%</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </CompanyFrame>
  );
}
