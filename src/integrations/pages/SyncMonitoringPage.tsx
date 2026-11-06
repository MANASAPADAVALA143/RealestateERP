import { useState } from "react";
import { Link } from "react-router-dom";
import { categoryById } from "@/integrations/engine/categories";
import { connectionState, connectorById } from "@/integrations/engine/connectors";
import { freshness, nextRun } from "@/integrations/engine/sync";
import type { ImportJob } from "@/integrations/engine/types";
import { SERVER_CONNECTOR_CONFIGURED } from "@/integrations/service/service";
import { Button, Empty, IntegrationPage, Notice, Pill, Section, Stat, fmtDateTime, useJobs } from "@/integrations/ui/components";
import { stateTone, useConnections } from "@/integrations/ui/connections";
import { integrationService } from "@/integrations/ui/hooks";

const OK = ["Imported", "Imported - exceptions open", "Published"];

function freshTone(state: string): string {
  return state === "fresh" ? "valid" : state === "never" ? "none" : state === "due" ? "warning" : "error";
}

export function SyncMonitoringPage() {
  const { workspace, connections } = useConnections();
  const jobs = (useJobs(workspace?.tenantId).data ?? []).filter((job) => job.status !== "Withdrawn");
  const [message, setMessage] = useState<string | null>(null);
  const failed = jobs.filter((job) => job.status === "Failed" || (job.failedRecords > 0 && job.status !== "Published"));
  const stale = connections.filter((connection) => {
    const last = jobs.find((job) => job.connectionId === connection.id && OK.includes(job.status));
    const state = freshness(last?.uploadedAt ?? null, connection.schedule, connection.freshnessDays).state;
    return connection.active && (state === "stale" || state === "due");
  });

  async function retry(job: ImportJob) {
    try {
      const result = await integrationService.retryFailed(job.id);
      setMessage(`${job.id}: ${result.recovered} recovered, ${result.stillFailing} still failing.`);
    } catch (error) {
      setMessage(`${job.id}: ${error instanceof Error ? error.message : "Retry failed."}`);
    }
  }

  return (
    <IntegrationPage title="Sync Monitoring" subtitle="Import status, data freshness, and failures for every connection.">
      <Notice tone="sky">
        <b>Scheduler: not running.</b> Scheduled and incremental synchronisation from APIs needs a server-side job runner, which this deployment does not have. Schedules below define the expected refresh, so freshness can be measured, and file imports are run manually.
      </Notice>
      {message ? <Notice tone="green">{message}</Notice> : null}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Connections" value={connections.filter((item) => item.active).length} />
        <Stat label="Imports run" value={jobs.length} />
        <Stat label="Due or stale" value={stale.length} tone="amber" />
        <Stat label="Needing retry" value={failed.length} tone="red" />
      </section>

      <Section title="Connections">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1100px] text-xs">
            <thead>
              <tr>
                <th>Connection</th>
                <th>System</th>
                <th>Mode</th>
                <th>State</th>
                <th>Expected refresh</th>
                <th>Last successful import</th>
                <th>Freshness</th>
                <th>Next expected</th>
                <th>Last mode</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((connection) => {
                const last = jobs.find((job) => job.connectionId === connection.id && OK.includes(job.status));
                const fresh = freshness(last?.uploadedAt ?? null, connection.schedule, connection.freshnessDays);
                const state = connectionState(connection.mode, connection.verification, SERVER_CONNECTOR_CONFIGURED);
                const next = nextRun(last?.uploadedAt ?? null, connection.schedule);
                return (
                  <tr key={connection.id}>
                    <td className="font-semibold">{connection.name}</td>
                    <td>{connectorById(connection.connectorId).name}</td>
                    <td>{connection.mode === "file" ? "File export" : "API"}</td>
                    <td><Pill tone={stateTone(state.state)}>{state.label}</Pill></td>
                    <td className="capitalize">{connection.schedule}</td>
                    <td>{last ? <Link to={`/data-integrations/history/${last.id}`} className="underline-offset-2 hover:underline">{fmtDateTime(last.uploadedAt)}</Link> : "—"}</td>
                    <td><Pill tone={freshTone(fresh.state)}>{fresh.label}</Pill></td>
                    <td>{next ? `${fmtDateTime(next)} (manual)` : "—"}</td>
                    <td>{last ? (last.syncMode === "full_refresh" ? "Full refresh" : "Incremental") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Freshness by data set" subtitle="Most recent successful import of each Common Data Model entity per connection.">
        {jobs.filter((job) => OK.includes(job.status)).length === 0 ? (
          <Empty>No successful imports yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px] text-xs">
              <thead>
                <tr>
                  <th>Connection</th>
                  <th>Data set</th>
                  <th>Last import</th>
                  <th>Periods</th>
                  <th>Status</th>
                  <th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {connections.flatMap((connection) => {
                  const latest = new Map<string, ImportJob>();
                  for (const job of jobs) if (job.connectionId === connection.id && OK.includes(job.status) && !latest.has(job.category)) latest.set(job.category, job);
                  return [...latest.values()].map((job) => {
                    const fresh = freshness(job.uploadedAt, connection.schedule, connection.freshnessDays);
                    return (
                      <tr key={`${connection.id}-${job.category}`}>
                        <td>{connection.name}</td>
                        <td>{categoryById(job.category).label}</td>
                        <td><Link to={`/data-integrations/history/${job.id}`} className="underline-offset-2 hover:underline">{fmtDateTime(job.uploadedAt)}</Link></td>
                        <td>{job.periods.length > 3 ? `${job.periods[0]} – ${job.periods[job.periods.length - 1]}` : job.periods.join(", ") || "—"}</td>
                        <td><Pill tone={job.status}>{job.status}</Pill></td>
                        <td><Pill tone={freshTone(fresh.state)}>{fresh.label}</Pill></td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Failed syncs and records to retry">
        {failed.length === 0 ? (
          <Empty>Nothing to retry.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px] text-xs">
              <thead>
                <tr>
                  <th>Import</th>
                  <th>Connection</th>
                  <th>Data set</th>
                  <th>When</th>
                  <th>Problem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {failed.map((job) => (
                  <tr key={job.id}>
                    <td className="font-semibold"><Link to={`/data-integrations/history/${job.id}`} className="underline-offset-2 hover:underline">{job.id}</Link></td>
                    <td>{connections.find((item) => item.id === job.connectionId)?.name ?? job.source}</td>
                    <td>{categoryById(job.category).label}</td>
                    <td>{fmtDateTime(job.uploadedAt)}</td>
                    <td className="max-w-md">{job.status === "Failed" ? job.error ?? "No records imported." : `${job.failedRecords} record(s) failed validation`}</td>
                    <td>{job.status === "Failed" ? <span className="text-navy/50">Upload a corrected file</span> : <Button onClick={() => retry(job)}>Retry failed records</Button>}</td>
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
