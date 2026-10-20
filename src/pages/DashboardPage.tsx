import { AiInsights } from "@/components/AiInsights";
import { CommandCenter } from "@/components/CommandCenter";
import { KpiCard, Lede, Panel, StatusBadge } from "@/components/ui";
import {
  deLabel,
  ebitdaMargin,
  entities,
  group,
  inrCr,
  inrCrShort,
  insights,
  pct,
  quarters,
} from "@/lib/demoData";

export function DashboardPage() {
  const peak = Math.max(...quarters.map((point) => point.revenue));
  const lift = ((quarters[3].revenue - quarters[0].revenue) / quarters[0].revenue) * 100;
  const netDebt = group.debt - group.cash;

  return (
    <div className="space-y-6">
      <CommandCenter />
      <Lede>
        Consolidated command view for six entities in the Agarwal Group real-estate book. FY26 revenue,
        balance sheet, and cash, with the two Watch names called out beside the flagship.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total revenue" value={inrCr(group.revenue)} hint="FY26 across 6 entities" />
        <KpiCard
          label="EBITDA margin"
          value={pct(group.ebitdaMargin)}
          hint={`${inrCr(group.ebitda)} on the consolidated book`}
          accent="gold"
        />
        <KpiCard label="Total assets" value={inrCr(group.assets)} hint="Consolidated gross assets" />
        <KpiCard
          label="Total debt"
          value={inrCr(group.debt)}
          hint={`Net debt ${inrCr(netDebt)} after cash`}
          accent="alert"
        />
        <KpiCard label="Net worth" value={inrCr(group.equity)} hint="Book equity of the six entities" accent="gold" />
        <KpiCard
          label="Cash"
          value={inrCr(group.cash)}
          hint={`Cash to debt ${pct((group.cash / group.debt) * 100)}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Quarterly revenue"
          subtitle={`FY26 total ${inrCr(group.revenue)}. Q4 is ${pct(lift)} above Q1.`}
        >
          <div className="relative h-64">
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between">
              <div className="border-t border-dashed border-navy/10" />
              <div className="border-t border-dashed border-navy/10" />
              <div className="border-t border-dashed border-navy/10" />
              <div className="border-t border-navy/15" />
            </div>
            <div
              className="relative flex h-full items-end gap-3 sm:gap-8"
              role="img"
              aria-label="Bar chart of group revenue from Q1 to Q4 FY26"
            >
              {quarters.map((point) => {
                const height = (point.revenue / peak) * 78;
                const isPeak = point.revenue === peak;
                return (
                  <div key={point.quarter} className="flex h-full flex-1 flex-col justify-end">
                    <p className="mb-2 text-center text-xs font-semibold text-navy">{inrCrShort(point.revenue)}</p>
                    <div
                      className={`rounded-t-lg border-t-4 ${isPeak ? "border-navy bg-gold" : "border-gold bg-navy"}`}
                      style={{ height: `${height}%` }}
                    />
                    <p className="mt-2 text-center text-xs font-medium uppercase tracking-[0.14em] text-navy/55">
                      {point.quarter}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-navy/45">Q1 to Q4 FY26 · group revenue · ₹ Crore</p>
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Revenue mix"
          subtitle="Share of FY26 group revenue by entity."
        >
          <div className="flex h-4 overflow-hidden rounded-full" aria-hidden="true">
            {entities.map((entity) => (
              <div
                key={entity.id}
                style={{
                  width: `${(entity.revenue / group.revenue) * 100}%`,
                  backgroundColor: entity.color,
                }}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {entities.map((entity) => (
              <li key={entity.id} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entity.color }} />
                <span className="w-12 font-semibold text-navy">{entity.code}</span>
                <span className="min-w-0 flex-1 truncate text-navy/70">{entity.name}</span>
                <span className="tabular-nums text-navy">{pct((entity.revenue / group.revenue) * 100)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="font-serif text-2xl text-navy">Entity health</h2>
          <p className="mt-1 text-sm text-navy/60">
            ARL, PCS, AFM, and PHC are Healthy. LBH and AHS are on Watch.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entities.map((entity) => (
            <article
              key={entity.id}
              className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card"
            >
              <div className="h-1.5" style={{ backgroundColor: entity.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{entity.code}</p>
                    <h3 className="font-serif text-lg leading-tight text-navy">{entity.name}</h3>
                    <p className="mt-1 text-xs text-navy/50">{entity.role}</p>
                  </div>
                  <StatusBadge status={entity.status} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-navy/70">{entity.focus}</p>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <Metric label="Revenue" value={inrCrShort(entity.revenue)} />
                  <Metric label="EBITDA" value={pct(ebitdaMargin(entity))} />
                  <Metric label="Assets" value={inrCrShort(entity.assets)} />
                  <Metric label="Debt" value={inrCrShort(entity.debt)} />
                  <Metric label="Cash" value={inrCrShort(entity.cash)} />
                  <Metric label="D/E" value={deLabel(entity.debt, entity.equity)} />
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AiInsights page="Dashboard" insights={insights.Dashboard} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-navy/45">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-navy">{value}</dd>
    </div>
  );
}
