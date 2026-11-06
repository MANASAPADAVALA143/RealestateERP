import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ifrs16InputFields, ifrs16OutputFields, ifrs16Payload, IFRS16_SCHEMA_VERSION } from "@/integrations/engine/ifrs16";
import { toCsv } from "@/integrations/engine/files";
import type { Dataset } from "@/integrations/engine/metrics";
import { commonDataModel, lineageFields } from "@/integrations/engine/cdm";
import { connectionState, connectorById, connectors } from "@/integrations/engine/connectors";
import { SERVER_CONNECTOR_CONFIGURED, type TenantSettings } from "@/integrations/service/service";
import { stateTone, useConnections } from "@/integrations/ui/connections";
import { Button, Empty, IntegrationPage, Notice, Pill, Section, fmtMoney, inputClass } from "@/integrations/ui/components";
import { download, integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

export function IntegrationSettingsPage() {
  const workspace = useWorkspace();
  const [draft, setDraft] = useState<TenantSettings | null>(null);
  const [newTenant, setNewTenant] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [lockInput, setLockInput] = useState("");
  const { connections } = useConnections();
  const dataset: Dataset = useAsync(async () => (workspace ? integrationService.dataset(workspace.tenantId) : ({} as Dataset)), [workspace?.tenantId]).data ?? {};

  useEffect(() => {
    if (workspace) setDraft(workspace.settings);
  }, [workspace?.tenantId, workspace?.settings]);

  if (!workspace || !draft) return null;
  const leases = dataset.lease_register ?? [];
  const results = dataset.ifrs16_results ?? [];
  const apiConnections = connections.filter((connection) => connection.mode === "api");

  async function save(detail: string, next: TenantSettings = draft as TenantSettings) {
    await integrationService.saveSettings(next, detail);
    setDraft(next);
    setSaved(detail);
  }

  function lockPeriod() {
    const period = lockInput.trim();
    if (!/^\d{4}(-\d{2}|-Q[1-4])?$/.test(period) || !draft) return;
    void save(`Reporting period ${period} locked. Imports and publishing for it are blocked.`, { ...draft, lockedPeriods: [...new Set([...draft.lockedPeriods, period])].sort() });
    setLockInput("");
  }

  return (
    <IntegrationPage title="Integration Settings" subtitle="Workspace, governance policies, the connector registry, the Common Data Model, storage, and the interfaces prepared for direct API connectivity and the dedicated IFRS 16 application.">
      {saved ? <Notice tone="green">Saved. {saved}</Notice> : null}

      <Section title="Workspace (tenant)" subtitle="Every job, record, template, link, and audit entry is stored with its workspace ID and only read back for that workspace.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
            Current workspace
            <select aria-label="Current workspace" className={`${inputClass} mt-1 block`} value={workspace.tenantId} onChange={(event) => integrationService.setTenant(event.target.value)}>
              {workspace.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
            New workspace
            <input className={`${inputClass} mt-1 block`} value={newTenant} onChange={(event) => setNewTenant(event.target.value)} placeholder="Customer name" />
          </label>
          <Button disabled={!newTenant.trim()} onClick={async () => { const tenant = await integrationService.addTenant(newTenant); await integrationService.setTenant(tenant.id); setNewTenant(""); }}>Add workspace</Button>
        </div>
        <p className="mt-3 text-xs text-navy/60">This separation is enforced in the browser store. Real tenant isolation between customers needs server-side authentication and row-level security, which are not configured in this deployment.</p>
      </Section>

      <Section title="Validation defaults">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
            Recorded as (uploaded by)
            <input className={`${inputClass} mt-1 block`} value={draft.userName} onChange={(event) => setDraft({ ...draft, userName: event.target.value })} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
            Materiality threshold ($)
            <input type="number" min={0} step={0.01} className={`${inputClass} mt-1 block w-36`} value={draft.materiality} onChange={(event) => setDraft({ ...draft, materiality: Math.max(0, Number(event.target.value)) })} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
            Default for ambiguous dates
            <select className={`${inputClass} mt-1 block`} value={draft.defaultDateOrder} onChange={(event) => setDraft({ ...draft, defaultDateOrder: event.target.value as TenantSettings["defaultDateOrder"] })}>
              <option value="MDY">MM/DD/YYYY (US Yardi default)</option>
              <option value="DMY">DD/MM/YYYY</option>
              <option value="YMD">YYYY-MM-DD</option>
            </select>
          </label>
          <Button primary onClick={() => save(`User "${draft.userName}", materiality ${fmtMoney(draft.materiality)}, ambiguous dates ${draft.defaultDateOrder}.`)}>Save defaults</Button>
        </div>
        <p className="mt-3 text-xs text-navy/60">No user sign-in is configured, so “uploaded by” is the name entered here. Differences larger than the materiality threshold are exceptions; nothing is rounded away.</p>
      </Section>

      <Section title="Storage and backend" subtitle="What persists imported data today, and what a production deployment needs.">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-navy/50">Active store</dt><dd className="font-semibold">{integrationService.storage.label}</dd></div>
          <div><dt className="text-navy/50">Server database</dt><dd className="font-semibold">Not configured</dd></div>
        </dl>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-navy/80">
          <li>The integration service writes through a storage interface. A server implementation can replace the browser store without changing the screens.</li>
          <li>The PostgreSQL schema (connectors, connections, import batches, Common Data Model tables, governance, conflicts, reconciliation, audit) with indexes and row-level workspace isolation is in <code>db/integration_schema.sql</code>. It installs into its own <code>estatecfo</code> schema and is safe to re-run.</li>
          <li>Original files, imported records, mapping templates, links, reconciliations, and the audit trail are all included in that schema.</li>
        </ul>
      </Section>

      <Section title="Data governance" subtitle="Policies applied to every source: ERP, Yardi, and Excel.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">Overwrite policy for published records</p>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="radio" name="policy" checked={draft.overwritePolicy === "approval"} onChange={() => save("Overwrite policy: replacement allowed only with explicit approval each time.", { ...draft, overwritePolicy: "approval" })} />
              <span><b>Approval each time</b> — publishing that would replace published records asks for confirmation, names the source being replaced, and logs the approval.</span>
            </label>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="radio" name="policy" checked={draft.overwritePolicy === "never"} onChange={() => save("Overwrite policy: never overwrite published records.", { ...draft, overwritePolicy: "never" })} />
              <span><b>Never overwrite</b> — overlapping imports are blocked until the existing records are unpublished.</span>
            </label>
            <p className="mt-2 text-xs text-navy/60">Records from different sources that share identifiers are never assumed to be the same; they are flagged as cross-source conflicts.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">Reporting-period locks</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.lockedPeriods.length === 0 ? <span className="text-sm text-navy/60">No periods locked.</span> : null}
              {draft.lockedPeriods.map((period) => (
                <span key={period} className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-ivory">
                  {period}
                  <button type="button" aria-label={`Unlock ${period}`} className="text-gold" onClick={() => save(`Reporting period ${period} unlocked.`, { ...draft, lockedPeriods: draft.lockedPeriods.filter((item) => item !== period) })}>×</button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input aria-label="Period to lock" className={inputClass} placeholder="2026-09, 2026-Q3, or 2026" value={lockInput} onChange={(event) => setLockInput(event.target.value)} />
              <Button onClick={lockPeriod} disabled={!/^\d{4}(-\d{2}|-Q[1-4])?$/.test(lockInput.trim())}>Lock period</Button>
            </div>
            <p className="mt-2 text-xs text-navy/60">Rows in a locked period fail validation, and imports covering it cannot be published.</p>
          </div>
        </div>
      </Section>

      <Section title="Connector registry" subtitle="Every source system has its own adapter. All adapters write to the same Common Data Model.">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px] text-xs">
            <thead>
              <tr><th>Connector</th><th>Family</th><th>Modes</th><th>File import</th><th>Direct API requirements</th><th className="text-right">Connections</th></tr>
            </thead>
            <tbody>
              {connectors.map((connector) => (
                <tr key={connector.id}>
                  <td className="font-semibold">{connector.name}<p className="font-normal text-navy/50">{connector.vendor}</p></td>
                  <td>{connector.family}</td>
                  <td>{connector.modes.map((mode) => (mode === "file" ? "File" : "API")).join(" · ")}</td>
                  <td className="max-w-xs">{connector.fileNote}</td>
                  <td className="max-w-xs">{connector.apiNote}</td>
                  <td className="text-right">{connections.filter((item) => item.connectorId === connector.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Direct API connections" subtitle="No ERP or Yardi API is called from this deployment." actions={<Pill tone="warning">Server connector not deployed</Pill>}>
        {apiConnections.length === 0 ? (
          <Empty>No connection is set to API mode. Set a connection to API mode on the ERP Connectors or Yardi Voyager page to track its verification checklist.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {apiConnections.map((connection) => {
              const state = connectionState(connection.mode, connection.verification, SERVER_CONNECTOR_CONFIGURED);
              return (
                <li key={connection.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ivory px-3 py-2">
                  <span><b>{connection.name}</b> · {connectorById(connection.connectorId).name} · {state.detail}</span>
                  <Pill tone={stateTone(state.state)}>{state.label}</Pill>
                </li>
              );
            })}
          </ul>
        )}
        <Notice tone="sky">
          A server-side connector implements the extraction contract for each adapter, holds credentials in a secret store, runs scheduled and incremental extractions, and reports each run to Sync Monitoring. A connection shows as connected only after authentication and a test extraction are verified there.
        </Notice>
      </Section>

      <Section title="Common Data Model" subtitle={`Every record keeps: ${lineageFields.join(", ")}.`}>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px] text-xs">
            <thead><tr><th>Entity</th><th>Import data sets</th><th>Feeds EstateCFO</th></tr></thead>
            <tbody>
              {commonDataModel.map((item) => (
                <tr key={item.entity}><td className="font-semibold">{item.entity}</td><td>{item.categories.join(", ")}</td><td>{item.feeds}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="IFRS 16 application exchange" subtitle="The dedicated IFRS 16 engine stays the system of record for lease accounting. EstateCFO does not calculate ROU assets, liabilities, depreciation, or interest." actions={<Pill tone="warning">API not available</Pill>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="font-semibold text-navy">Export to the IFRS 16 engine</h4>
            <p className="mt-1 text-xs text-navy/60">Schema {IFRS16_SCHEMA_VERSION}. Fields: {ifrs16InputFields.map((field) => field.label).join(", ")}.</p>
            <p className="mt-2 text-sm">{leases.length} published lease record(s) available.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button disabled={leases.length === 0} onClick={() => download("ifrs16_lease_input.json", JSON.stringify(ifrs16Payload(leases, workspace.tenantId), null, 2), "application/json")}>Download JSON</Button>
              <Button disabled={leases.length === 0} onClick={() => { const payload = ifrs16Payload(leases, workspace.tenantId); const keys = Object.keys(payload.leases[0] ?? {}); download("ifrs16_lease_input.csv", toCsv([keys, ...payload.leases.map((row) => keys.map((key) => row[key] ?? ""))]), "text/csv"); }}>Download CSV</Button>
            </div>
            {leases.length === 0 ? <p className="mt-2 text-xs text-navy/50">Import and publish a Lease Register first.</p> : null}
          </div>
          <div>
            <h4 className="font-semibold text-navy">Import results from the IFRS 16 engine</h4>
            <p className="mt-1 text-xs text-navy/60">Expected fields: {ifrs16OutputFields.map((field) => field.label).join(", ")}.</p>
            <Link to="/data-integrations/import?category=ifrs16_results" className="mt-2 inline-block rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Import engine results file</Link>
          </div>
        </div>
        <div className="mt-4">
          {results.length === 0 ? (
            <Empty>No IFRS 16 engine results have been published.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[900px] text-xs">
                <thead>
                  <tr>
                    {ifrs16OutputFields.map((field) => (
                      <th key={field.key}>{field.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 100).map((record) => (
                    <tr key={record.id}>
                      {ifrs16OutputFields.map((field) => (
                        <td key={field.key} className="tabular-nums">{field.type === "number" ? fmtMoney(record.values[field.key] as number) : String(record.values[field.key] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-navy/50">Shown as returned by the engine (source import {[...new Set(results.map((record) => record.jobId))].join(", ")}).</p>
            </div>
          )}
        </div>
      </Section>

      <Section title="AI Financial Analyst" actions={<Pill tone="warning">Language model not connected</Pill>}>
        <p className="text-sm text-navy/80">
          The analyst answers a fixed set of questions with deterministic calculations on published, validated records and cites the entity, property, period, and import behind each figure. Connecting a language model needs a server-side service with an approved provider; questions and financial data are not sent anywhere from this browser.{" "}
          <Link to="/ai-analyst" className="font-semibold underline-offset-2 hover:underline">Open the analyst</Link>.
        </p>
      </Section>

      <Section title="Security">
        <ul className="list-disc space-y-1 pl-5 text-sm text-navy/80">
          <li>No API keys, passwords, or tokens are requested, stored, or logged by these screens.</li>
          <li>Imported financial data is not written to the browser console or sent to any external service.</li>
          <li>CSV downloads escape cells that start with =, +, -, or @ to prevent formula injection in Excel.</li>
          <li>Uploaded files are parsed locally. Files whose contents do not match their extension are rejected and logged as failed imports.</li>
        </ul>
      </Section>
    </IntegrationPage>
  );
}
