import { useState } from "react";
import { useParams } from "react-router-dom";
import { Attention, CompanyFrame, moneyClass } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { getBook, signedCr } from "@/lib/drillData";

const periods = ["Yearly", "Quarterly", "Monthly"] as const;

export function CompanyAssetsPage() {
  const { entityId = "" } = useParams();
  const book = getBook(entityId);
  const [period, setPeriod] = useState<(typeof periods)[number]>("Yearly");
  const [year, setYear] = useState(2026);
  if (!book) return <CompanyFrame entityId={entityId} page="Assets"><p /></CompanyFrame>;
  const prior = book.years.find((row) => row.year === year - 1) ?? book.years[0];
  const current = book.years.find((row) => row.year === year) ?? book.years[book.years.length - 1];
  const delta = current.assets - prior.assets;
  const factor = period === "Yearly" ? 1 : period === "Quarterly" ? 0.25 : 1 / 12;
  const nonCurrent = current.assets - current.currentAssets;

  return (
    <CompanyFrame entityId={entityId} page="Assets">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((item) => (
          <button key={item} type="button" onClick={() => setPeriod(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${period === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>
            {item}
          </button>
        ))}
        <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-full border border-navy/15 bg-white px-3 py-1.5 text-sm font-semibold">
          {book.years.map((row) => (
            <option key={row.year} value={row.year}>{row.year}</option>
          ))}
        </select>
      </div>
      <Panel title="Total asset value">
        <p className="font-serif text-4xl text-navy">{inrCr(current.assets * (period === "Yearly" ? 1 : 1))}</p>
        <p className={`mt-1 text-sm ${moneyClass(delta)}`}>{signedCr(delta * factor)} vs prior {period.toLowerCase()}</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy/5">
          <div className="h-full rounded-full bg-navy" style={{ width: `${Math.min((current.assets / book.entity.assets) * 100, 100)}%` }} />
        </div>
      </Panel>
      <section className="grid gap-4 md:grid-cols-3">
        <Panel title="Non-current assets"><p className="font-serif text-2xl">{inrCr(nonCurrent)}</p></Panel>
        <Panel title="Current assets"><p className="font-serif text-2xl">{inrCr(current.currentAssets)}</p></Panel>
        <Panel title="Bank accounts"><p className="font-serif text-2xl">{inrCr(current.bank)}</p></Panel>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {book.assetCards.map((card) => (
          <Panel key={card.name} title={card.name}>
            <p className="font-serif text-2xl">{inrCr(card.value * (year === 2026 ? 1 : year / 2026))}</p>
            <p className="mt-1 text-xs text-navy/55">Prior year {inrCr(card.prior)}</p>
          </Panel>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Needs attention">
          <Attention
            items={[
              book.lowCash ? { text: "Low cash ratio against current liabilities", value: inrCr(book.entity.cash) } : { text: "Cash ratio is inside the operating band" },
              { text: book.properties.some((row) => row.market <= 0) ? "One property is missing a market value" : "Market values are present on the property rows" },
            ]}
          />
        </Panel>
        <Panel title="Asset insights">
          <ul className="space-y-2 text-sm">
            <li>Largest category: {largest(book.composition).name} at {inrCr(largest(book.composition).value)}</li>
            <li>Portfolio change vs prior year: {signedCr(book.entity.assets - prior.assets)}</li>
          </ul>
        </Panel>
      </div>
    </CompanyFrame>
  );
}

function largest(slices: { name: string; value: number }[]) {
  return slices.reduce((best, slice) => (slice.value > best.value ? slice : best), slices[0]);
}
