import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building, FileSpreadsheet, Server } from "lucide-react";
import { commonDataModel } from "@/integrations/engine/cdm";
import { categoryById } from "@/integrations/engine/categories";
import { connectionState, connectorById, type ConnectorFamily } from "@/integrations/engine/connectors";
import type { Dataset } from "@/integrations/engine/metrics";
import { SERVER_CONNECTOR_CONFIGURED } from "@/integrations/service/service";
import { Empty, IntegrationPage, Pill, Section, Stat, StorageNotice, fmtDateTime, useJobs } from "@/integrations/ui/components";
import { stateTone, useConnections } from "@/integrations/ui/connections";
import { integrationService, useAsync } from "@/integrations/ui/hooks";

const SUCCESS = ["Imported", "Imported - exceptions open", "Published"];

const layers: [string, string, string][] = [
  ["A", "Connector Registry", "engine/connectors.ts — Excel, Yardi Voyager 8, SAP S/4HANA, SAP Business One, Oracle Fusion, Oracle NetSuite, Dynamics 365"],
  ["B", "Source-Specific Adapters", "Per-system column dictionaries and derivations (for example SAP S/H indicator, Dynamics signed amounts)"],
  ["C", "Data Extraction Services", "File extraction today; API extraction contract prepared for a server-side connector"],
  ["D", "File and API Processing", "XLSX, XLS, CSV parsing, worksheet and header detection; API processing not deployed"],
  ["E", "Field Mapping Engine", "Suggestions, confirmations, saved templates, source-specific profiles"],
  ["F", "Data Validation Engine", "Types, required fields, GL, trial balance, statements, period locks"],
  ["G", "Master Data Matching", "Stable codes and saved links; names never merge records"],
  ["H", "Common Data Model", "17 shared entities with full lineage on every record"],
  ["I", "Reconciliation Engine", "Source vs EstateCFO by entity, property, account, and period"],
  ["J", "Synchronisation Manager", "Manual, incremental, full refresh, retry, freshness; scheduler needs a server"],
  ["K", "Audit and Exception Management", "Append-only audit trail, reviewed exceptions, overwrite approvals"],
];

export function IntegrationDashboardPage() {
  const { workspace, connections } = useConnections();
  const jobs = useJobs(workspace?.tenantId).data ?? [];
  const unmapped = useAsync(async () => (workspace ? integrationService.unmappedRecords(workspace.tenantId) : { total: 0, byRule: {} }), [workspace?.tenantId]).data;
  const dataset: Dataset = useAsync(async () => (workspace ? integrationService.dataset(workspace.tenantId) : ({} as Dataset)), [workspace?.tenantId]).data ?? {};
  const active = jobs.filter((job) => job.status !== "Withdrawn");
  const successful = active.filter((job) => SUCCESS.includes(job.status));
  const failed = active.filter((job) => job.status === "Failed");
  const pending = active.filter((job) => job.status === "Imported - exceptions open");
  const records = successful.reduce((total, job) => total + job.successfulRecords, 0);
  const last = successful[0];
  const apiConnected = connections.filter((connection) => connectionState(connection.mode, connection.verification, SERVER_CONNECTOR_CONFIGURED).state === "verified").length;
  const byCategory = Object.values(
    successful.reduce<Record<string, { category: string; records: number }>>((acc, job) => {
      const label = categoryById(job.category).label;
      acc[label] = { category: label, records: (acc[label]?.records ?? 0) + job.successfulRecords };
      return acc;
    }, {}),
  ).sort((a, b) => b.records - a.records);

  return (
    <IntegrationPage title="Integration Overview" subtitle="One integration engine for ERP, Yardi, and Excel sources. Every source is transformed into the EstateCFO Common Data Model that feeds the existing financial modules.">
      <StorageNotice />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Data source connections" value={connections.filter((item) => item.active).length} hint={`${connections.filter((item) => item.mode === "api").length} API · ${connections.filter((item) => item.mode === "file").length} file`} />
        <Stat label="Verified API connections" value={apiConnected} tone={apiConnected ? "green" : "amber"} hint="Needs a server-side connector and a tested extraction" />
        <Stat label="Successful imports" value={successful.length} tone="green" to="/data-integrations/history" />
        <Stat label="Failed imports" value={failed.length} tone="red" to="/data-integrations/sync" />
        <Stat label="Records imported" value={records.toLocaleString("en-US")} tone="gold" />
        <Stat label="Pending validation" value={pending.length} tone="amber" to="/data-integrations/validation" />
        <Stat label="Unmapped records" value={(unmapped?.total ?? 0).toLocaleString("en-US")} tone="amber" hint="Unmatched property, entity, or GL account" to="/data-integrations/validation" />
        <Stat label="Last successful import" value={last ? fmtDateTime(last.uploadedAt) : "None yet"} hint={last ? `${categoryById(last.category).label} · ${last.source}` : "Manual file imports"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <FamilyCard family="ERP" icon={<Building className="h-5 w-5" aria-hidden="true" />} to="/data-integrations/erp" connections={connections} jobs={active} />
        <FamilyCard family="Yardi" icon={<Server className="h-5 w-5" aria-hidden="true" />} to="/data-integrations/yardi" connections={connections} jobs={active} />
        <FamilyCard family="Excel" icon={<FileSpreadsheet className="h-5 w-5" aria-hidden="true" />} to="/data-integrations/import" connections={connections} jobs={active} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Section title="Universal Integration Engine" subtitle="Logical layers and where each is implemented.">
          <ol className="space-y-2 text-sm">
            {layers.map(([letter, name, detail]) => (
              <li key={letter} className="flex gap-3 rounded-xl bg-ivory px-3 py-2">
                <b className="w-5 shrink-0 text-gold">{letter}</b>
                <span><b className="text-navy">{name}</b> <span className="text-navy/60">— {detail}</span></span>
              </li>
            ))}
          </ol>
        </Section>
        <Section title="Common Data Model" subtitle="Published records per shared entity, from all sources combined.">
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr><th>Entity</th><th className="text-right">Published records</th><th>Feeds</th></tr>
              </thead>
              <tbody>
                {commonDataModel.map((item) => (
                  <tr key={item.entity}>
                    <td className="font-semibold">{item.entity}</td>
                    <td className="text-right tabular-nums">{item.categories.reduce((total, category) => total + (dataset[category]?.length ?? 0), 0).toLocaleString("en-US")}</td>
                    <td className="text-navy/60">{item.feeds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </section>

      <Section title="Records imported by data set" subtitle="Successful imports only. Withdrawn imports are excluded.">
        {byCategory.length === 0 ? (
          <Empty>No records imported yet. Start with entities and properties, then a chart of accounts, then ledger data.</Empty>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" width={170} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="records" fill="#0B1D33" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>
    </IntegrationPage>
  );
}

function FamilyCard({ family, icon, to, connections, jobs }: { family: ConnectorFamily; icon: React.ReactNode; to: string; connections: ReturnType<typeof useConnections>["connections"]; jobs: { connectionId: string; uploadedAt: string; successfulRecords: number; status: string; id: string; category: string; fileName: string }[] }) {
  const mine = connections.filter((connection) => connectorById(connection.connectorId).family === family);
  const ids = new Set(mine.map((connection) => connection.id));
  const myJobs = jobs.filter((job) => ids.has(job.connectionId));
  const title = family === "ERP" ? "ERP connectors" : family === "Yardi" ? "Yardi Voyager" : "Excel / CSV";
  return (
    <article className="flex flex-col rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-gold">{icon}</span>
        <div>
          <h3 className="font-serif text-xl text-navy">{title}</h3>
          <p className="text-xs text-navy/50">{mine.length} connection(s) · {myJobs.reduce((total, job) => total + job.successfulRecords, 0).toLocaleString("en-US")} records</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2 text-xs">
        {mine.length === 0 ? <li className="text-navy/60">No connections yet.</li> : null}
        {mine.map((connection) => {
          const state = connectionState(connection.mode, connection.verification, SERVER_CONNECTOR_CONFIGURED);
          const last = myJobs.find((job) => job.connectionId === connection.id && SUCCESS.includes(job.status));
          return (
            <li key={connection.id} className="rounded-xl bg-ivory px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <b className="text-navy">{connection.name}</b>
                <Pill tone={stateTone(state.state)}>{state.label}</Pill>
              </div>
              <p className="mt-1 text-navy/60">{connectorById(connection.connectorId).name} · {connection.mode === "file" ? "file export" : "API"} · last import {last ? fmtDateTime(last.uploadedAt) : "—"}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto pt-4">
        <Link to={to} className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Open {title}</Link>
      </div>
    </article>
  );
}
