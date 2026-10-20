import { Attention } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { coverageFor, daysUntil, entityPoliciesSafe, perilsFor, renewalsFor } from "@/lib/drillData";

export function InsuranceRisk({ entityId }: { entityId?: string }) {
  const policies = entityPoliciesSafe(entityId);
  const premium = policies.reduce((sum, policy) => sum + policy.premium, 0);
  const coverage = coverageFor(entityId);
  const gap = coverage.reduce((sum, row) => sum + row.gap, 0);
  const expiring = policies.filter((policy) => daysUntil(policy.expiry) <= 90 && daysUntil(policy.expiry) >= 0).length;
  const claims = policies.filter((policy) => policy.claim !== "None" && !policy.claim.startsWith("YTD")).length;
  const next = renewalsFor(entityId)[0];
  const types = new Set(policies.map((policy) => policy.type)).size;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">+ Add Policy</button>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-navy/50">Annual premium</p>
          <p className="mt-2 font-serif text-3xl">{inrCr(premium)}</p>
        </article>
        <article className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-navy/50">Coverage position</p>
          <p className="mt-2 font-serif text-3xl text-red-700">{gap > 0 ? inrCr(gap) : "No gap"}</p>
          <p className="mt-1 text-xs text-navy/55">{gap > 0 ? "Gap against insurable value" : "Cover meets the insurable value"}</p>
        </article>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Policy types", String(types)],
          ["Expiring ≤ 90 days", String(expiring)],
          ["Open claims", String(claims)],
          ["Next renewal", next ? `${next.days} days` : "—"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-navy/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{label}</p>
            <p className="mt-2 font-serif text-2xl">{value}</p>
          </article>
        ))}
      </section>
      <Panel title="Coverage-gap analysis" bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Property</th>
                <th className="text-right">Insurable value</th>
                <th className="text-right">Insured amount</th>
                <th className="text-right">Gap</th>
                <th className="text-right">Coverage ratio</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => (
                <tr key={row.property}>
                  <td className="font-medium">{row.property}</td>
                  <td className="text-right tabular-nums">{inrCr(row.insurable)}</td>
                  <td className="text-right tabular-nums">{inrCr(row.insured)}</td>
                  <td className="text-right tabular-nums">{inrCr(row.gap)}</td>
                  <td className="text-right tabular-nums">{row.ratio.toFixed(1)}%</td>
                  <td className={row.status === "Adequate" ? "text-emerald-700" : "font-semibold text-red-700"}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Per-peril coverage" bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Property</th>
                <th>Fire / property</th>
                <th>Flood</th>
                <th>Windstorm / hail</th>
                <th>General liability</th>
                <th>Earthquake</th>
              </tr>
            </thead>
            <tbody>
              {perilsFor(entityId).map((row) => (
                <tr key={row.property}>
                  <td>{row.property}</td>
                  <td>{mark(row.fire)}</td>
                  <td>{mark(row.flood)}</td>
                  <td>{mark(row.wind)}</td>
                  <td>{mark(row.liability)}</td>
                  <td>{mark(row.quake)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Renewal timeline">
        <ul className="space-y-2 text-sm">
          {renewalsFor(entityId).map((row) => (
            <li key={row.detail} className="flex flex-wrap justify-between gap-2 border-b border-navy/5 py-2">
              <span><b>{row.days} days</b> — {row.name}</span>
              <span className="text-navy/60">{row.detail} · {row.premium}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Needs attention">
        <Attention
          items={coverage
            .filter((row) => row.status !== "Adequate")
            .map((row) => ({ text: `${row.property} is below the insurable value`, value: inrCr(row.gap) }))}
        />
      </Panel>
    </div>
  );
}

function mark(on: boolean): string {
  return on ? "Yes" : "—";
}
