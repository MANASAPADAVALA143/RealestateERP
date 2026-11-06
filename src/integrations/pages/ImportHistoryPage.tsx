import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categoryById } from "@/integrations/engine/categories";
import { errorReportCsv, recordsCsv } from "@/integrations/engine/files";
import type { AuditEntry, ImportJob, StoredRecord } from "@/integrations/engine/types";
import { Button, Empty, ErrorNote, IntegrationPage, Notice, Pill, Section, Stat, TextArea, fmtDateTime, inputClass, useJobs } from "@/integrations/ui/components";
import { download, integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";
import { PublishControl } from "@/integrations/ui/PublishControl";

async function downloadOriginal(job: ImportJob) {
  const file = await integrationService.file(job.id);
  if (file) download(file.name, file.data, "application/octet-stream");
}

async function downloadErrors(job: ImportJob) {
  const records = await integrationService.records(job.id);
  const rows = records.filter((record) => record.issues.length > 0);
  const header = job.error ? `File-level error: ${job.error}\r\n` : "";
  download(`${job.id}_error_report.csv`, header + errorReportCsv(rows), "text/csv");
}

export function ImportHistoryPage() {
  const workspace = useWorkspace();
  const jobs = useJobs(workspace?.tenantId).data ?? [];
  const audit = useAsync(async () => (workspace ? integrationService.auditLog(workspace.tenantId) : ([] as AuditEntry[])), [workspace?.tenantId]).data ?? [];
  const [tab, setTab] = useState<"imports" | "audit">("imports");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const filtered = jobs.filter((job) => (!category || job.category === category) && (!status || job.status === status));

  async function retry(job: ImportJob) {
    setBusy(job.id);
    try {
      const result = await integrationService.retryFailed(job.id);
      setMessage(`${job.id}: ${result.recovered} recovered, ${result.stillFailing} still failing.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retry failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <IntegrationPage title="Import History" subtitle="Every upload, including failed ones, with its original file, results, and audit trail.">
      <div className="flex flex-wrap gap-2">
        {(["imports", "audit"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>
            {item === "imports" ? `Imports (${jobs.length})` : `Audit trail (${audit.length})`}
          </button>
        ))}
      </div>
      {message ? <Notice tone="sky">{message}</Notice> : null}

      {tab === "imports" ? (
        <Section
          title="Imports"
          actions={
            <div className="flex flex-wrap gap-2">
              <select aria-label="Filter by category" className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {[...new Set(jobs.map((job) => job.category))].map((id) => (
                  <option key={id} value={id}>{categoryById(id).label}</option>
                ))}
              </select>
              <select aria-label="Filter by status" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {["Published", "Imported", "Imported - exceptions open", "Failed", "Withdrawn"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <Empty>No imports yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1500px] text-xs">
                <thead>
                  <tr>
                    <th>Import ID</th>
                    <th>Source</th>
                    <th>File</th>
                    <th>Category</th>
                    <th>Entity</th>
                    <th>Property</th>
                    <th>Period</th>
                    <th>Uploaded by</th>
                    <th>Uploaded</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Successful</th>
                    <th className="text-right">Failed</th>
                    <th className="text-right">Duplicate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job) => (
                    <tr key={job.id}>
                      <td className="font-semibold"><Link to={`/data-integrations/history/${job.id}`} className="underline-offset-2 hover:underline">{job.id}</Link></td>
                      <td>{job.source}</td>
                      <td className="max-w-[12rem] truncate">{job.fileName}</td>
                      <td>{categoryById(job.category).label}</td>
                      <td>{summarize(job.entityIds)}</td>
                      <td>{summarize(job.propertyIds)}</td>
                      <td>{summarize(job.periods)}</td>
                      <td>{job.uploadedBy}</td>
                      <td className="whitespace-nowrap">{fmtDateTime(job.uploadedAt)}</td>
                      <td className="text-right tabular-nums">{job.totalRecords}</td>
                      <td className="text-right tabular-nums">{job.successfulRecords}</td>
                      <td className="text-right tabular-nums">{job.failedRecords}</td>
                      <td className="text-right tabular-nums">{job.duplicateRecords}</td>
                      <td><Pill tone={job.status}>{job.status}</Pill></td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <Link to={`/data-integrations/history/${job.id}`} className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-inset ring-navy/15">View</Link>
                          <button type="button" className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-inset ring-navy/15" onClick={() => downloadOriginal(job)}>Original</button>
                          <button type="button" className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-inset ring-navy/15" onClick={() => downloadErrors(job)}>Errors</button>
                          {job.status !== "Failed" ? <Link to={`/data-integrations/validation?job=${job.id}`} className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-inset ring-navy/15">Validation</Link> : null}
                          {reconKindFor(job) ? <Link to={`/data-integrations/reconciliation?kind=${reconKindFor(job)}&job=${job.id}`} className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-inset ring-navy/15">Reconcile</Link> : null}
                          {job.failedRecords > 0 && job.status !== "Published" && job.status !== "Withdrawn" ? (
                            <button type="button" disabled={busy === job.id} className="rounded-full bg-navy px-3 py-1 font-semibold text-ivory" onClick={() => retry(job)}>Retry failed</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      ) : (
        <AuditTable entries={audit} />
      )}
    </IntegrationPage>
  );
}

function summarize(values: string[]): string {
  if (values.length === 0) return "—";
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

export function reconKindFor(job: ImportJob): string | null {
  const map: Partial<Record<ImportJob["category"], string>> = { trial_balance: "tb_vs_gl", gl_transactions: "gl_vs_gl", property_master: "property_master", lease_register: "lease_register", accounts_payable: "ap", accounts_receivable: "ar" };
  return job.status === "Failed" ? null : map[job.category] ?? null;
}

function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <Section title="Audit trail" subtitle="Imports, mapping changes, master-data links, reviews, publishing, and approvals. Entries cannot be edited.">
      {entries.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table className="data-table min-w-[900px] text-xs">
            <thead className="sticky top-0">
              <tr>
                <th>When</th>
                <th>By</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(entry.at)}</td>
                  <td>{entry.by}</td>
                  <td className="font-semibold">{entry.action}</td>
                  <td>{entry.target.startsWith("IMP-") ? <Link to={`/data-integrations/history/${entry.target}`} className="underline-offset-2 hover:underline">{entry.target}</Link> : entry.target}</td>
                  <td>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export function ImportJobPage() {
  const { jobId = "" } = useParams();
  const job = useAsync(async () => integrationService.job(jobId), [jobId]).data;
  const records = useAsync(async () => integrationService.records(jobId), [jobId]).data ?? ([] as StoredRecord[]);
  const audit = useAsync(async () => (job ? (await integrationService.auditLog(job.tenantId)).filter((entry) => entry.target === job.id) : []), [job?.id]).data ?? [];
  const [filter, setFilter] = useState("all");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!job) return <IntegrationPage title="Import" crumbs={[{ label: "Import History", to: "/data-integrations/history" }, { label: jobId }]}><Empty>Import {jobId} was not found in this browser’s store.</Empty></IntegrationPage>;
  const category = categoryById(job.category);
  const shown = records.filter((record) => filter === "all" || record.status === filter);

  return (
    <IntegrationPage
      title={job.id}
      subtitle={`${category.label} · ${job.fileName} · ${job.source}`}
      crumbs={[{ label: "Import History", to: "/data-integrations/history" }, { label: job.id }]}
      actions={<Pill tone={job.status}>{job.status}</Pill>}
    >
      {job.error ? <ErrorNote>{job.error}</ErrorNote> : null}
      {message ? <Notice tone="sky">{message}</Notice> : null}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Total" value={job.totalRecords} />
        <Stat label="Successful" value={job.successfulRecords} tone="green" />
        <Stat label="Failed" value={job.failedRecords} tone="red" />
        <Stat label="Duplicate" value={job.duplicateRecords} tone="red" />
        <Stat label="Warnings" value={job.warningRecords} tone="amber" />
        <Stat label="Checks" value={job.fileChecks.length ? `${job.fileChecks.filter((check) => check.passed).length}/${job.fileChecks.length} passed` : "—"} />
      </section>
      <Section title="Details">
        <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Uploaded by", job.uploadedBy],
            ["Uploaded", fmtDateTime(job.uploadedAt)],
            ["Worksheet", job.sheetName || "—"],
            ["Header row", job.sheetName ? String(job.headerRow + 1) : "—"],
            ["Entities", job.entityIds.join(", ") || "—"],
            ["Properties", job.propertyIds.length > 8 ? `${job.propertyIds.slice(0, 8).join(", ")} +${job.propertyIds.length - 8}` : job.propertyIds.join(", ") || "—"],
            ["Reporting periods", job.periods.join(", ") || "—"],
            ["File size", `${(job.fileSize / 1024).toFixed(1)} KB`],
          ].map(([label, value]) => (
            <div key={label}><dt className="text-navy/50">{label}</dt><dd className="font-semibold">{value}</dd></div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => downloadOriginal(job)}>Download original file</Button>
          <Button onClick={() => downloadErrors(job)}>Download error report</Button>
          <Button onClick={() => download(`${job.id}_records.csv`, recordsCsv(records.filter((record) => record.status === "imported"), category.fields.map((field) => field.key)), "text/csv")} disabled={job.successfulRecords === 0}>Download imported records</Button>
          {job.status !== "Failed" ? <Link to={`/data-integrations/validation?job=${job.id}`} className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Validation results</Link> : null}
          {reconKindFor(job) ? <Link to={`/data-integrations/reconciliation?kind=${reconKindFor(job)}&job=${job.id}`} className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Reconcile</Link> : null}
          {job.failedRecords > 0 && job.status !== "Published" && job.status !== "Withdrawn" ? (
            <Button primary onClick={async () => { const result = await integrationService.retryFailed(job.id); setMessage(`${result.recovered} recovered, ${result.stillFailing} still failing.`); }}>Retry failed records</Button>
          ) : null}
        </div>
      </Section>

      <Section title="Publish to EstateCFO" subtitle="Published records feed the CFO dashboard, properties, statements, loans, insurance, payables, receivables, and treasury. Overwrites need confirmation.">
        <PublishControl job={job} />
        {job.status !== "Withdrawn" && job.status !== "Failed" ? (
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-navy/5 pt-4">
            <div className="min-w-[20rem] flex-1">
              <TextArea label="Withdraw this import (reason required)" value={reason} onChange={setReason} placeholder="e.g. Superseded by a corrected Yardi export" />
            </div>
            <Button danger disabled={!reason.trim()} onClick={() => integrationService.withdraw(job.id, reason)}>Withdraw import</Button>
          </div>
        ) : null}
      </Section>

      <Section
        title="Records"
        subtitle="Each record keeps its source system, source record ID, import ID, entity, property, and period."
        actions={
          <select aria-label="Filter records" className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>
            {["all", "imported", "error", "duplicate"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        }
      >
        {shown.length === 0 ? (
          <Empty>No records in this view.</Empty>
        ) : (
          <div className="max-h-[30rem] overflow-auto">
            <table className="data-table min-w-[1100px] text-xs">
              <thead className="sticky top-0">
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Source record</th>
                  <th>Entity</th>
                  <th>Property</th>
                  <th>Period</th>
                  {category.fields.slice(0, 6).filter((field) => !["entity_id", "property_id", "period"].includes(field.key)).map((field) => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 300).map((record) => (
                  <tr key={record.id}>
                    <td>{record.row}</td>
                    <td><Pill tone={record.status}>{record.status}</Pill></td>
                    <td className="max-w-[10rem] truncate">{record.sourceRecordId}</td>
                    <td>{record.entityId ?? "—"}</td>
                    <td>{record.propertyId ?? "—"}</td>
                    <td>{record.period ?? "—"}</td>
                    {category.fields.slice(0, 6).filter((field) => !["entity_id", "property_id", "period"].includes(field.key)).map((field) => (
                      <td key={field.key} className="max-w-[10rem] truncate">{record.values[field.key] === null || record.values[field.key] === undefined ? "" : String(record.values[field.key])}</td>
                    ))}
                    <td className="max-w-[18rem] truncate" title={record.issues.map((issue) => issue.message).join("\n")}>{record.issues.map((issue) => issue.message).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length > 300 ? <p className="mt-2 text-xs text-navy/50">Showing 300 of {shown.length}. Download imported records for the full set.</p> : null}
          </div>
        )}
      </Section>

      <AuditTable entries={audit} />
    </IntegrationPage>
  );
}
