import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { categoryById } from "@/integrations/engine/categories";
import { errorReportCsv } from "@/integrations/engine/files";
import type { StoredRecord } from "@/integrations/engine/types";
import { Button, Empty, ErrorNote, IntegrationPage, Notice, Pill, Section, SeverityPill, Stat, TextArea, inputClass, useJobs } from "@/integrations/ui/components";
import { download, integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

export function ValidationPage() {
  const workspace = useWorkspace();
  const tenantId = workspace?.tenantId;
  const jobs = (useJobs(tenantId).data ?? []).filter((job) => job.status !== "Withdrawn" && job.status !== "Failed");
  const [params, setParams] = useSearchParams();
  const jobId = params.get("job") ?? jobs.find((job) => job.status === "Imported - exceptions open")?.id ?? jobs[0]?.id;
  const job = jobs.find((item) => item.id === jobId);
  const records = useAsync(async () => (jobId ? integrationService.records(jobId) : ([] as StoredRecord[])), [jobId]).data ?? [];
  const master = useAsync(async () => (tenantId ? integrationService.master(tenantId) : null), [tenantId]).data;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "error" | "warning" | "duplicate">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const withIssues = records.filter((record) => record.issues.length > 0 && (filter === "all" || (filter === "warning" ? record.status === "imported" : record.status === filter)));
  const unmatched = useMemo(() => {
    const map = new Map<string, { kind: "property" | "entity"; sourceId: string; count: number; rule: string }>();
    for (const record of records) {
      for (const issue of record.issues) {
        if (!["property_unmatched", "entity_unmatched", "property_possible_duplicate", "entity_possible_duplicate"].includes(issue.rule) || !issue.value) continue;
        const kind = issue.rule.startsWith("property") ? "property" : "entity";
        const key = `${kind}|${issue.value}`;
        const entry = map.get(key) ?? { kind, sourceId: issue.value, count: 0, rule: issue.rule };
        entry.count += 1;
        map.set(key, entry);
      }
    }
    return [...map.values()];
  }, [records]);
  const unmappedAccounts = useMemo(() => [...new Set(records.flatMap((record) => record.issues.filter((issue) => issue.rule === "account_unmapped").map((issue) => issue.value ?? "")))], [records]);

  async function retry() {
    if (!job) return;
    setFailure(null);
    try {
      const result = await integrationService.retryFailed(job.id);
      setMessage(`${result.recovered} record(s) now pass and were imported. ${result.stillFailing} still failing.`);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Retry failed.");
    }
  }

  return (
    <IntegrationPage title="Data Validation" subtitle="File-level financial checks, row exceptions, and master-data matching for each import. Values are never changed to force a balance; exceptions are reviewed and noted.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          Import
          <select aria-label="Import job" className={`${inputClass} mt-1 block min-w-[22rem]`} value={jobId ?? ""} onChange={(event) => setParams({ job: event.target.value })}>
            {jobs.map((item) => (
              <option key={item.id} value={item.id}>{item.id} · {categoryById(item.category).label} · {item.fileName} · {item.status}</option>
            ))}
          </select>
        </label>
        {job ? <Pill tone={job.status}>{job.status}</Pill> : null}
      </div>

      {!job ? (
        <Empty>No imports to validate yet. <Link to="/data-integrations/import" className="font-semibold underline">Import a file</Link>.</Empty>
      ) : (
        <>
          {message ? <Notice tone="green">{message}</Notice> : null}
          {failure ? <ErrorNote>{failure}</ErrorNote> : null}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Total records" value={job.totalRecords} />
            <Stat label="Imported" value={job.successfulRecords} tone="green" />
            <Stat label="With warnings" value={job.warningRecords} tone="amber" />
            <Stat label="Failed" value={job.failedRecords} tone="red" />
            <Stat label="Duplicates" value={job.duplicateRecords} tone="red" />
          </section>

          {job.fileChecks.length === 0 ? null : (
            <Section title="Financial checks" subtitle="Calculated on imported records only. Duplicates and rows with errors are excluded.">
              <div className="space-y-3">
                {job.fileChecks.map((check) => {
                  const ack = job.acknowledgements.find((item) => item.checkId === check.id);
                  return (
                    <div key={check.id} className={`rounded-xl border p-4 ${check.passed ? "border-emerald-200 bg-emerald-50/60" : check.material ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{check.label}</p>
                        <Pill tone={check.passed ? "valid" : ack ? "warning" : check.material ? "error" : "warning"}>{check.passed ? "Passed" : ack ? "Exception reviewed" : check.material ? "Open exception" : "Review"}</Pill>
                      </div>
                      <p className="mt-1 text-sm">{check.message}</p>
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        {check.details.map((detail) => (
                          <div key={detail.label} className="flex justify-between gap-3 border-b border-navy/5 py-1">
                            <dt className="text-navy/60">{detail.label}</dt>
                            <dd className="font-semibold tabular-nums">{typeof detail.value === "number" ? detail.value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                      {ack ? (
                        <p className="mt-2 text-xs text-navy/60">Reviewed by {ack.by}: “{ack.note}”. The figures were left as imported.</p>
                      ) : !check.passed && check.material ? (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <div className="min-w-[20rem] flex-1">
                            <TextArea label="Review note (required)" value={notes[check.id] ?? ""} onChange={(value) => setNotes({ ...notes, [check.id]: value })} placeholder="e.g. Yardi report excludes the suspense account; confirmed with property accountant." />
                          </div>
                          <Button disabled={!(notes[check.id] ?? "").trim()} onClick={() => integrationService.acknowledge(job.id, check.id, notes[check.id] ?? "")}>Record review</Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {unmatched.length || unmappedAccounts.length ? (
            <Section title="Unmapped master data" subtitle="Link source codes to EstateCFO records, then retry the failed rows. Two properties with the same name are never merged automatically.">
              {unmatched.length ? (
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[760px]">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Source code</th>
                        <th>Rows</th>
                        <th>Issue</th>
                        <th>Link to EstateCFO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatched.map((item) => (
                        <tr key={`${item.kind}-${item.sourceId}`}>
                          <td className="capitalize">{item.kind}</td>
                          <td className="font-semibold">{item.sourceId}</td>
                          <td>{item.count}</td>
                          <td>{item.rule.includes("possible") ? "Possible duplicate" : "Not in master"}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <select aria-label={`Link ${item.sourceId}`} className={inputClass} defaultValue="" onChange={(event) => event.target.value && tenantId && integrationService.link(tenantId, item.kind, item.sourceId, event.target.value, "Linked on the Data Validation page.")}>
                                <option value="">Choose…</option>
                                {(item.kind === "property" ? master?.data.properties : master?.data.entities)?.map((record) => (
                                  <option key={record.id} value={record.id}>{record.id} · {record.name}</option>
                                ))}
                              </select>
                              {item.rule.includes("possible") ? <Button onClick={() => tenantId && integrationService.link(tenantId, item.kind, item.sourceId, "__new__", "Confirmed as separate on the Data Validation page.")}>Separate {item.kind}</Button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {unmappedAccounts.length ? (
                <Notice>
                  GL account(s) not in the chart of accounts: <b>{unmappedAccounts.join(", ")}</b>. These rows were imported with a warning but are left out of classified reports until the accounts are added to a published chart of accounts.
                </Notice>
              ) : null}
              <div className="mt-3">
                <Button primary disabled={job.failedRecords === 0 || job.status === "Published"} onClick={retry} title={job.status === "Published" ? "Unpublish before retrying" : undefined}>
                  Retry {job.failedRecords} failed record(s)
                </Button>
              </div>
            </Section>
          ) : job.failedRecords > 0 ? (
            <Button primary disabled={job.status === "Published"} onClick={retry}>Retry {job.failedRecords} failed record(s)</Button>
          ) : null}

          <Section
            title="Row exceptions"
            actions={
              <div className="flex flex-wrap gap-2">
                {(["all", "error", "warning", "duplicate"] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>{item}</button>
                ))}
                <Button onClick={() => download(`${job.id}_errors.csv`, errorReportCsv(records.filter((record) => record.issues.length)), "text/csv")}>Download error report</Button>
              </div>
            }
          >
            {withIssues.length === 0 ? (
              <Empty>No exceptions in this view.</Empty>
            ) : (
              <div className="max-h-[28rem] overflow-auto">
                <table className="data-table min-w-[900px] text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Row</th>
                      <th>Record status</th>
                      <th>Severity</th>
                      <th>Field</th>
                      <th>Value</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withIssues.slice(0, 400).flatMap((record) =>
                      record.issues.map((issue, index) => (
                        <tr key={`${record.id}-${index}`}>
                          <td>{record.row}</td>
                          <td><Pill tone={record.status}>{record.status}</Pill></td>
                          <td><SeverityPill severity={issue.severity} /></td>
                          <td>{issue.field ?? "—"}</td>
                          <td className="max-w-[10rem] truncate">{issue.value}</td>
                          <td>{issue.message}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </IntegrationPage>
  );
}
