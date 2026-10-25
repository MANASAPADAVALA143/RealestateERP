import { Fragment, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, Kpi, Progress, RePage, StatusPill } from "@/realestate/ui";
import { coverageGaps, insurance, policies, totalCoverageGap, usd } from "@/realestate/data";

export function ReInsurancePage() {
  const [rows, setRows] = useState(policies);
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <RePage page="Insurance" title="Insurance">
      <section className="grid gap-3 lg:grid-cols-2">
        <Kpi label="Annual premium" value={usd(insurance.premium)} hint="4 active policies">
          <Progress pct={100} />
        </Kpi>
        <article className="rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.14em] text-navy/50">Coverage position</p>
          <p className="mt-2 font-serif text-3xl text-red-700">{usd(-totalCoverageGap)}</p>
          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            <span>Total coverage <b className="tabular-nums">{usd(insurance.totalCoverage)}</b></span>
            <span>Next renewal <b>{insurance.nextRenewalDays} days</b></span>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Policy types" value="3" hint="2× Property · 1× Vehicle · 1× Umbrella" />
        <Kpi label="Expiring ≤ 90 days" value="0" hint="none expiring soon" />
        <Kpi label="Open claims" value="0" />
        <Kpi label="Next renewal" value="99 days" hint={insurance.nextRenewalProperty} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Umbrella" value="$10,000,000" />
        <Kpi label="Property" value="$3,200,000" />
        <Kpi label="Vehicle" value="$75,000" />
      </section>

      <Card title="Coverage-gap analysis" right={<span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">NEW</span>}>
        <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm leading-relaxed text-navy">
          ⚠ <b>Austin Blvd Commercial Lot is critically underinsured — $38M exposure gap.</b> Recommended action:
          increase coverage to minimum $20M or obtain separate land policy.
        </p>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px] [&_td]:px-3 [&_th]:px-3">
            <thead>
              <tr>
                <th>Property</th>
                <th className="text-right">Insurable value</th>
                <th className="text-right">Insured amount</th>
                <th className="text-right">Gap</th>
                <th>Coverage ratio</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coverageGaps.map((row) => {
                const covered = row.status === "Fully Covered";
                return (
                  <tr key={row.property}>
                    <td className="font-medium">{row.property}</td>
                    <td className="text-right tabular-nums">{usd(row.insurable)}</td>
                    <td className="text-right tabular-nums">{usd(row.insured)}</td>
                    <td className={`text-right tabular-nums ${covered ? "" : "font-semibold text-red-700"}`}>{usd(row.gap)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-navy/10">
                          <div className={`h-full ${covered ? "bg-emerald-600" : "bg-red-600"}`} style={{ width: `${Math.min(row.ratio, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{row.ratio}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusPill text={row.status} tone={covered ? "green" : "red"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Claims & loss history">
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label="Total claimed (YTD)" value="$0" />
          <Kpi label="Insurance paid" value="$0" tone="green" />
          <Kpi label="Company responsibility" value="$0" />
        </div>
        <p className="mt-4 text-sm text-navy/60">No claims on record.</p>
      </Card>

      <Card title="Policies">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th>Type</th>
                <th>Insurer</th>
                <th>Policy #</th>
                <th>Property / location</th>
                <th className="text-right">Coverage</th>
                <th className="text-right">Premium</th>
                <th>Expiry</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>{row.type}</td>
                    <td className="font-medium">{row.insurer}</td>
                    <td>{row.number}</td>
                    <td>{row.location}</td>
                    <td className="text-right tabular-nums">{usd(row.coverage)}</td>
                    <td className="text-right tabular-nums">{usd(row.premium)}</td>
                    <td>{row.expiry}</td>
                    <td><StatusPill text="Active" tone="green" /></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setViewing(viewing === row.id ? null : row.id)} className="text-xs font-semibold text-blue-700 hover:underline">
                          {viewing === row.id ? "Hide" : "View"}
                        </button>
                        <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`Delete ${row.number}`} className="text-navy/40 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {viewing === row.id ? (
                    <tr>
                      <td colSpan={9} className="text-sm text-navy/70">
                        {row.type} cover with {row.insurer}, policy {row.number}, insuring {row.location} for {usd(row.coverage)} at an annual premium of {usd(row.premium)}. Renews {row.expiry}.
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-navy/50">All policies removed. Reload the page to restore the demo set.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </RePage>
  );
}
