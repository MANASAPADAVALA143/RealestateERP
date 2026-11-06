import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Database } from "lucide-react";
import { loanSummary, portfolioKpis, propertyPnl, propertyValues, type Dataset, type Scope } from "@/integrations/engine/metrics";
import { normalizeId } from "@/integrations/engine/matching";
import type { CategoryId, StoredRecord } from "@/integrations/engine/types";
import { Empty, Pill, fmtMoney, inputClass } from "@/integrations/ui/components";
import { integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

export function usePublished(): { dataset: Dataset; loading: boolean } {
  const workspace = useWorkspace();
  const state = useAsync(async () => (workspace ? integrationService.dataset(workspace.tenantId) : ({} as Dataset)), [workspace?.tenantId]);
  return { dataset: state.data ?? {}, loading: state.loading || !workspace };
}

export function sourcesLine(records: StoredRecord[]): ReactNode {
  const jobs = [...new Set(records.map((record) => record.jobId))];
  const periods = [...new Set(records.map((record) => record.period).filter(Boolean))].sort();
  const sources = [...new Set(records.map((record) => record.sourceSystem))];
  const dates = jobs.map((job) => job.match(/^IMP-(\d{4})(\d{2})(\d{2})/)).filter((match): match is RegExpMatchArray => Boolean(match)).map((match) => `${match[1]}-${match[2]}-${match[3]}`).sort();
  const latest = dates[dates.length - 1];
  const ageDays = latest ? Math.floor((Date.now() - Date.parse(`${latest}T00:00:00`)) / 86_400_000) : null;
  return (
    <span>
      Source: {sources.join(" + ") || "import"} ·{" "}
      {jobs.map((job) => (
        <Link key={job} to={`/data-integrations/history/${job}`} className="mr-1 underline">{job}</Link>
      ))}
      {periods.length ? `· ${periods.length > 4 ? `${periods[0]} to ${periods[periods.length - 1]}` : periods.join(", ")}` : ""}
      {latest ? ` · imported ${latest}${ageDays !== null && ageDays > 31 ? ` (${ageDays} days ago — check Sync Monitoring)` : ""}` : ""}
    </span>
  );
}

export function ImportedPanel({ title, children, subtitle, actions }: { title: string; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gold/40 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/20 bg-gold/5 px-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            <Database className="h-3.5 w-3.5" aria-hidden="true" /> Imported data · validated and published
          </p>
          <h3 className="mt-1 font-serif text-xl text-navy">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-navy/60">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function NotPublished({ what, category }: { what: string; category: CategoryId }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-navy/20 bg-sky-50/50 px-5 py-4 text-sm text-navy/70">
      <span>
        <b className="text-navy">No imported {what} yet.</b> The figures below are demonstration data. Publish a validated import to show your own.
      </span>
      <Link to={`/data-integrations/import?category=${category}`} className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Import {what}</Link>
    </div>
  );
}

function EntityScope({ dataset, scope, onChange }: { dataset: Dataset; scope: Scope; onChange: (scope: Scope) => void }) {
  const entities = [...new Set(Object.values(dataset).flat().map((record) => record?.entityId).filter((value): value is string => Boolean(value)))].sort();
  if (entities.length < 2) return null;
  return (
    <select aria-label="Entity" className={inputClass} value={scope.entity ?? ""} onChange={(event) => onChange({ ...scope, entity: event.target.value || undefined })}>
      <option value="">All entities</option>
      {entities.map((entity) => (
        <option key={entity}>{entity}</option>
      ))}
    </select>
  );
}

export function ImportedDashboardKpis() {
  const { dataset, loading } = usePublished();
  const [scope, setScope] = useState<Scope>({});
  if (loading) return null;
  const relevant: CategoryId[] = ["balance_sheet", "income_statement", "property_master", "loan_register"];
  const records = relevant.flatMap((category) => dataset[category] ?? []);
  if (records.length === 0) {
    return <NotPublished what="financial data" category="balance_sheet" />;
  }
  const kpis = portfolioKpis(dataset, scope);
  return (
    <ImportedPanel title="Portfolio position from imports" subtitle={sourcesLine(records)} actions={<EntityScope dataset={dataset} scope={scope} onChange={setScope} />}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <article key={kpi.key} className="rounded-xl border border-navy/10 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">{kpi.label}</p>
            <p className="mt-1 font-serif text-xl text-navy">{kpi.value === null ? "—" : kpi.format === "ratio" ? `${kpi.value.toFixed(2)}x` : kpi.format === "pct" ? `${kpi.value.toFixed(1)}%` : fmtMoney(kpi.value)}</p>
            <p className="mt-1 text-[11px] leading-snug text-navy/50">{kpi.missing ?? kpi.basis}</p>
          </article>
        ))}
      </div>
    </ImportedPanel>
  );
}

export function ImportedProperties() {
  const { dataset, loading } = usePublished();
  const [scope, setScope] = useState<Scope>({});
  if (loading) return null;
  const master = (dataset.property_master ?? []).filter((record) => !scope.entity || normalizeId(record.entityId ?? "") === normalizeId(scope.entity));
  const pnl = propertyPnl(dataset, scope);
  if (master.length === 0 && !pnl) return <NotPublished what="property master" category="property_master" />;
  return (
    <div className="space-y-4">
      {master.length ? (
        <ImportedPanel title={`Property master · ${master.length} properties`} subtitle={sourcesLine(master)} actions={<EntityScope dataset={dataset} scope={scope} onChange={setScope} />}>
          <div className="max-h-96 overflow-auto">
            <table className="data-table min-w-[900px] text-xs">
              <thead className="sticky top-0">
                <tr>
                  <th>Property ID</th>
                  <th>Name</th>
                  <th>Entity</th>
                  <th>Type</th>
                  <th>City</th>
                  <th className="text-right">Acquisition cost</th>
                  <th className="text-right">Market value</th>
                </tr>
              </thead>
              <tbody>
                {master.map((record) => (
                  <tr key={record.id}>
                    <td className="font-semibold">{record.propertyId}</td>
                    <td>{String(record.values.property_name ?? "")}</td>
                    <td>{record.entityId ?? "—"}</td>
                    <td>{String(record.values.property_type ?? "")}</td>
                    <td>{String(record.values.city ?? "")}</td>
                    <td className="text-right tabular-nums">{fmtMoney(record.values.acquisition_cost as number)}</td>
                    <td className="text-right tabular-nums">{fmtMoney(record.values.market_value as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ImportedPanel>
      ) : null}
      {pnl ? (
        <ImportedPanel title="Property financial performance (from the general ledger)" subtitle={<>{sourcesLine(dataset.gl_transactions ?? [])} · classified with the published chart of accounts</>}>
          {pnl.properties.length === 0 ? (
            <Empty>No GL lines could be classified. Publish a Chart of Accounts.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[820px]">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">of which rent</th>
                    <th className="text-right">Operating expenses</th>
                    <th className="text-right">NOI</th>
                    <th className="text-right">Non-operating</th>
                    <th className="text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pnl.properties].sort((a, b) => b.noi - a.noi).map((row) => (
                    <tr key={row.property}>
                      <td><b>{row.property}</b> <span className="text-navy/60">{row.name !== row.property ? row.name : ""}</span></td>
                      <td className="text-right tabular-nums">{fmtMoney(row.revenue)}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.rentalRevenue)}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.operatingExpenses)}</td>
                      <td className={`text-right font-semibold tabular-nums ${row.noi < 0 ? "!text-red-700" : ""}`}>{fmtMoney(row.noi)}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.nonOperating)}</td>
                      <td className={`text-right tabular-nums ${row.net < 0 ? "!text-red-700" : ""}`}>{fmtMoney(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pnl.unclassified.length ? (
            <p className="mt-3 text-xs text-amber-800">
              Left out: GL account(s) {pnl.unclassified.map((item) => `${item.account} (${fmtMoney(item.amount)})`).join(", ")} are not in the chart of accounts.
            </p>
          ) : null}
        </ImportedPanel>
      ) : null}
    </div>
  );
}

export function ImportedLoans() {
  const { dataset, loading } = usePublished();
  if (loading) return null;
  const summary = loanSummary(dataset, {}, propertyValues(dataset));
  if (!summary) return <NotPublished what="loan register" category="loan_register" />;
  return (
    <ImportedPanel title={`Loan register · ${summary.count} loans`} subtitle={sourcesLine(dataset.loan_register ?? [])}>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Loan balances", fmtMoney(summary.balance)],
          ["Monthly debt service", fmtMoney(summary.monthlyPayment)],
          ["Interest expense", fmtMoney(summary.interestExpense)],
          ["Principal repaid", fmtMoney(summary.principalRepaid)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-navy/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">{label}</p>
            <p className="mt-1 font-serif text-xl">{value}</p>
          </article>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[1000px] text-xs">
          <thead>
            <tr>
              <th>Loan</th>
              <th>Lender</th>
              <th>Entity</th>
              <th>Property</th>
              <th className="text-right">Balance</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Monthly</th>
              <th className="text-right">Interest</th>
              <th className="text-right">Principal</th>
              <th>Maturity</th>
              <th className="text-right">LTV</th>
            </tr>
          </thead>
          <tbody>
            {summary.loans.map((loan) => (
              <tr key={loan.id}>
                <td className="font-semibold">{loan.id}</td>
                <td>{loan.lender}</td>
                <td>{loan.entity}</td>
                <td>{loan.property || "—"}</td>
                <td className="text-right tabular-nums">{fmtMoney(loan.balance)}</td>
                <td className="text-right tabular-nums">{loan.rate}%</td>
                <td className="text-right tabular-nums">{fmtMoney(loan.monthly)}</td>
                <td className="text-right tabular-nums">{fmtMoney(loan.interest)}</td>
                <td className="text-right tabular-nums">{fmtMoney(loan.principal)}</td>
                <td>{loan.maturity}</td>
                <td className="text-right tabular-nums">{loan.ltv === null ? "—" : `${loan.ltv.toFixed(1)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-navy/50">LTV uses the loan’s collateral value, or the published property master market value when collateral is blank.</p>
    </ImportedPanel>
  );
}

export function ImportedInsurance() {
  const { dataset, loading } = usePublished();
  if (loading) return null;
  const policies = dataset.insurance_schedule ?? [];
  if (policies.length === 0) return <NotPublished what="insurance schedule" category="insurance_schedule" />;
  const names = new Map((dataset.property_master ?? []).map((record) => [normalizeId(record.propertyId ?? ""), String(record.values.property_name ?? "")]));
  return (
    <ImportedPanel title={`Insurance schedule · ${policies.length} policies`} subtitle={sourcesLine(policies)}>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[1000px] text-xs">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Insured property</th>
              <th>Insurer</th>
              <th>Type</th>
              <th className="text-right">Insured value</th>
              <th className="text-right">Coverage</th>
              <th className="text-right">Coverage ratio</th>
              <th className="text-right">Premium</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((record) => {
              const insured = record.values.insured_value as number | null;
              const coverage = record.values.coverage_amount as number;
              const ratio = insured ? Math.round((coverage / insured) * 100) : null;
              return (
                <tr key={record.id}>
                  <td className="font-semibold">{String(record.values.policy_number)}</td>
                  <td>{record.propertyId} <span className="text-navy/60">{names.get(normalizeId(record.propertyId ?? "")) ?? ""}</span></td>
                  <td>{String(record.values.insurer ?? "")}</td>
                  <td>{String(record.values.coverage_type ?? "")}</td>
                  <td className="text-right tabular-nums">{fmtMoney(insured)}</td>
                  <td className="text-right tabular-nums">{fmtMoney(coverage)}</td>
                  <td className="text-right">{ratio === null ? "—" : <Pill tone={ratio >= 100 ? "valid" : "error"}>{ratio}%</Pill>}</td>
                  <td className="text-right tabular-nums">{fmtMoney(record.values.premium as number)}</td>
                  <td>{String(record.values.expiry_date ?? "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ImportedPanel>
  );
}
