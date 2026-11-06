import { Fragment, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { categoryById } from "@/integrations/engine/categories";
import { reconKinds, type ReconFilters, type ReconKind } from "@/integrations/engine/reconcile";
import { reconDisplayStatus, type ReconRun } from "@/integrations/service/service";
import { Button, Empty, ErrorNote, IntegrationPage, Pill, Section, Stat, fmtDateTime, fmtMoney, inputClass, useJobs } from "@/integrations/ui/components";
import { integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

const statusLabel: Record<string, string> = {
  matched: "Matched",
  difference: "Difference",
  missing_in_destination: "Missing in EstateCFO",
  missing_in_source: "Missing in source",
  duplicate_source: "Duplicate in source",
  duplicate_destination: "Duplicate in EstateCFO",
};

export function ReconciliationPage() {
  const workspace = useWorkspace();
  const tenantId = workspace?.tenantId;
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<ReconKind>((params.get("kind") as ReconKind) || "tb_vs_gl");
  const definition = reconKinds.find((item) => item.id === kind) ?? reconKinds[0];
  const jobs = (useJobs(tenantId).data ?? []).filter((job) => job.category === definition.source && job.status !== "Failed" && job.status !== "Withdrawn");
  const [sourceJob, setSourceJob] = useState(params.get("job") ?? "");
  const [filters, setFilters] = useState<ReconFilters>({});
  const runs = useAsync(async () => (tenantId ? integrationService.reconRuns(tenantId) : ([] as ReconRun[])), [tenantId]).data ?? [];
  const [runId, setRunId] = useState<string | null>(params.get("run"));
  const run = runs.find((item) => item.id === runId) ?? null;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showMatched, setShowMatched] = useState(false);

  useEffect(() => {
    if (!jobs.some((job) => job.id === sourceJob) && jobs[0]) setSourceJob(jobs[0].id);
  }, [jobs, sourceJob]);

  async function execute() {
    if (!tenantId || !sourceJob) return;
    setError(null);
    try {
      const next = await integrationService.reconcile(tenantId, kind, sourceJob, Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) as ReconFilters);
      setRunId(next.id);
      setParams({ kind, job: sourceJob, run: next.id });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Reconciliation failed.");
    }
  }

  const lines = run ? run.result.lines.filter((line) => showMatched || line.status !== "matched") : [];

  return (
    <IntegrationPage title="Reconciliation Centre" subtitle="Compare an import with what EstateCFO holds. A comparison is marked reconciled only when no difference, missing record, or duplicate remains.">
      <Section title="New reconciliation">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50 xl:col-span-2">
            Comparison
            <select aria-label="Comparison" className={`${inputClass} mt-1 block w-full`} value={kind} onChange={(event) => { setKind(event.target.value as ReconKind); setSourceJob(""); }}>
              {reconKinds.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50 xl:col-span-2">
            Source import ({categoryById(definition.source).label})
            <select aria-label="Source import" className={`${inputClass} mt-1 block w-full`} value={sourceJob} onChange={(event) => setSourceJob(event.target.value)}>
              {jobs.length === 0 ? <option value="">No {categoryById(definition.source).label} imports yet</option> : null}
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.id} · {job.fileName} · {job.periods.join(", ") || "no period"}</option>
              ))}
            </select>
          </label>
          {(["entity", "property", "account", "period"] as const).map((key) => (
            <label key={key} className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
              {key}
              <input aria-label={`Filter by ${key}`} className={`${inputClass} mt-1 block w-full`} placeholder={key === "period" ? "e.g. 2026-09" : "All"} value={filters[key] ?? ""} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-navy/60">Destination: {definition.destination}. Measure: {definition.measure}. Materiality: {fmtMoney(workspace?.settings.materiality ?? 1)}.</p>
        {error ? <div className="mt-3"><ErrorNote>{error}</ErrorNote></div> : null}
        <div className="mt-3"><Button primary disabled={!sourceJob} onClick={execute}>Run reconciliation</Button></div>
      </Section>

      {run ? (
        <Section title={reconKinds.find((item) => item.id === run.kind)?.label ?? run.kind} subtitle={`${run.id} · source ${run.sourceJobId} · ${fmtDateTime(run.at)} by ${run.by}`} actions={<Pill tone={reconDisplayStatus(run)}>{reconDisplayStatus(run)}</Pill>}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Source balance" value={fmtMoney(run.result.summary.sourceBalance)} />
            <Stat label="EstateCFO balance" value={fmtMoney(run.result.summary.destinationBalance)} />
            <Stat label="Difference" value={fmtMoney(run.result.summary.difference)} tone={Math.abs(run.result.summary.difference) > run.materiality ? "red" : "green"} />
            <Stat label="Matched records" value={run.result.summary.matched} tone="green" />
            <Stat label="Unmatched (amount differs)" value={run.result.summary.unmatched} tone="red" />
            <Stat label="Missing records" value={run.result.summary.missing} tone="red" />
            <Stat label="Duplicate records" value={run.result.summary.duplicates} tone="red" />
            <Stat label="Open exceptions" value={run.result.lines.filter((line) => line.status !== "matched" && !run.acknowledgements[line.key]).length} tone="amber" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showMatched} onChange={(event) => setShowMatched(event.target.checked)} /> Show matched records</label>
          </div>
          {lines.length === 0 ? (
            <div className="mt-3"><Empty>{run.result.status === "Reconciled" ? "Every record matched within materiality." : "No lines in this view."}</Empty></div>
          ) : (
            <div className="mt-3 max-h-[32rem] overflow-auto">
              <table className="data-table min-w-[1000px] text-xs">
                <thead className="sticky top-0">
                  <tr>
                    <th>Status</th>
                    <th>Entity</th>
                    <th>Property</th>
                    <th>Account</th>
                    <th>Period</th>
                    <th className="text-right">Source</th>
                    <th className="text-right">EstateCFO</th>
                    <th className="text-right">Difference</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(0, 500).map((line) => (
                    <Fragment key={line.key}>
                      <tr className="cursor-pointer" onClick={() => setExpanded(expanded === line.key ? null : line.key)}>
                        <td><Pill tone={line.status === "matched" ? "matched" : line.status.startsWith("duplicate") ? "duplicate" : "error"}>{statusLabel[line.status]}</Pill></td>
                        <td>{line.entity ?? "—"}</td>
                        <td>{line.property ?? "—"}</td>
                        <td>{line.account ?? "—"}</td>
                        <td>{line.period ?? "—"}</td>
                        <td className="text-right tabular-nums">{fmtMoney(line.sourceAmount)}</td>
                        <td className="text-right tabular-nums">{fmtMoney(line.destinationAmount)}</td>
                        <td className={`text-right tabular-nums ${line.difference ? "!text-red-700" : ""}`}>{fmtMoney(line.difference)}</td>
                        <td>{run.acknowledgements[line.key] ? <Pill tone="warning">Reviewed</Pill> : line.status === "matched" ? null : <span className="text-navy/50">Open</span>}</td>
                      </tr>
                      {expanded === line.key ? (
                        <tr>
                          <td colSpan={9} className="bg-ivory">
                            <p className="font-semibold">{line.note}</p>
                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                              <Detail title="Source record" values={line.source} />
                              <Detail title="EstateCFO record" values={line.destination} />
                            </div>
                            {line.status !== "matched" ? (
                              run.acknowledgements[line.key] ? (
                                <p className="mt-2 text-navy/60">Reviewed by {run.acknowledgements[line.key].by}: “{run.acknowledgements[line.key].note}”. The difference stays open in the totals.</p>
                              ) : (
                                <div className="mt-2 flex flex-wrap items-end gap-2" onClick={(event) => event.stopPropagation()}>
                                  <input aria-label="Review note" className={`${inputClass} min-w-[20rem] flex-1`} placeholder="Explain the difference (required)" value={notes[line.key] ?? ""} onChange={(event) => setNotes({ ...notes, [line.key]: event.target.value })} />
                                  <Button disabled={!(notes[line.key] ?? "").trim()} onClick={() => integrationService.acknowledgeException(run.id, line.key, notes[line.key] ?? "")}>Record review</Button>
                                </div>
                              )
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      ) : null}

      <Section title="Previous reconciliations">
        {runs.length === 0 ? (
          <Empty>No reconciliations run yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Comparison</th>
                  <th>Source import</th>
                  <th>When</th>
                  <th className="text-right">Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((item) => (
                  <tr key={item.id}>
                    <td><button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => setRunId(item.id)}>{item.id}</button></td>
                    <td>{reconKinds.find((kindItem) => kindItem.id === item.kind)?.label}</td>
                    <td><Link to={`/data-integrations/history/${item.sourceJobId}`} className="underline-offset-2 hover:underline">{item.sourceJobId}</Link></td>
                    <td>{fmtDateTime(item.at)}</td>
                    <td className="text-right tabular-nums">{fmtMoney(item.result.summary.difference)}</td>
                    <td><Pill tone={reconDisplayStatus(item)}>{reconDisplayStatus(item)}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </IntegrationPage>
  );
}

function Detail({ title, values }: { title: string; values?: Record<string, string | number | null> }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/50">{title}</p>
      {values ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {Object.entries(values).filter(([, value]) => value !== null && value !== "").slice(0, 14).map(([key, value]) => (
            <Fragment key={key}>
              <dt className="text-navy/50">{key}</dt>
              <dd className="truncate">{String(value)}</dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <p className="text-navy/50">No record.</p>
      )}
    </div>
  );
}
