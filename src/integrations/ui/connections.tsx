import { useState } from "react";
import { apiRequirements, connectionState, connectorById, connectors, type ConnectionMode, type ConnectorFamily, type ConnectorId } from "@/integrations/engine/connectors";
import { freshness, type Schedule } from "@/integrations/engine/sync";
import { SERVER_CONNECTOR_CONFIGURED, type Connection } from "@/integrations/service/service";
import { Button, Empty, Notice, Pill, Section, fmtDateTime, inputClass, useJobs } from "@/integrations/ui/components";
import { integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

export function useConnections(family?: ConnectorFamily) {
  const workspace = useWorkspace();
  const all = useAsync(async () => (workspace ? integrationService.connections(workspace.tenantId) : ([] as Connection[])), [workspace?.tenantId]).data ?? [];
  return { workspace, connections: all.filter((item) => !family || connectorById(item.connectorId).family === family) };
}

export function stateTone(state: string): string {
  return state === "ready" ? "valid" : state === "verified" ? "valid" : "warning";
}

export function ConnectionsPanel({ family, title, onSelect, selectedId }: { family: ConnectorFamily; title: string; onSelect?: (id: string) => void; selectedId?: string }) {
  const { workspace, connections } = useConnections(family);
  const jobs = useJobs(workspace?.tenantId).data ?? [];
  const [editing, setEditing] = useState<Connection | null>(null);
  const [adding, setAdding] = useState(false);
  const options = connectors.filter((connector) => connector.family === family);
  const blank = (): Connection => ({
    id: "",
    tenantId: workspace?.tenantId ?? "",
    connectorId: options[0].id,
    name: "",
    environment: "Production",
    mode: "file",
    schedule: "monthly",
    freshnessDays: 31,
    verification: {},
    createdAt: "",
    createdBy: "",
    active: true,
  });

  async function save(connection: Connection) {
    const { id, createdAt, createdBy, ...rest } = connection;
    void createdAt;
    void createdBy;
    await integrationService.saveConnection({ ...rest, id: id || undefined, name: rest.name.trim() || `${connectorById(rest.connectorId).name} — ${rest.environment}` });
    setEditing(null);
    setAdding(false);
  }

  const form = editing ?? (adding ? blank() : null);

  return (
    <Section title={title} subtitle="Each connection keeps its own mapping profile, schedule, lineage, and duplicate checks." actions={<Button primary onClick={() => { setEditing(null); setAdding(true); }}>+ Add connection</Button>}>
      {connections.length === 0 ? (
        <Empty>No {family} connections yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1000px] text-xs">
            <thead>
              <tr>
                <th>Connection</th>
                <th>System</th>
                <th>Environment</th>
                <th>Mode</th>
                <th>Connection state</th>
                <th>Schedule</th>
                <th>Last import</th>
                <th>Freshness</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {connections.map((connection) => {
                const state = connectionState(connection.mode, connection.verification, SERVER_CONNECTOR_CONFIGURED);
                const last = jobs.find((job) => job.connectionId === connection.id && ["Imported", "Imported - exceptions open", "Published"].includes(job.status));
                const fresh = freshness(last?.uploadedAt ?? null, connection.schedule, connection.freshnessDays);
                return (
                  <tr key={connection.id} className={selectedId === connection.id ? "bg-gold/10" : ""}>
                    <td className="font-semibold">{connection.name}{connection.active ? "" : " (inactive)"}</td>
                    <td>{connectorById(connection.connectorId).name}</td>
                    <td>{connection.environment}</td>
                    <td>{connection.mode === "file" ? "File export" : "API"}</td>
                    <td><Pill tone={stateTone(state.state)}>{state.label}</Pill><p className="mt-1 max-w-[16rem] text-[11px] text-navy/50">{state.detail}</p></td>
                    <td className="capitalize">{connection.schedule}</td>
                    <td>{last ? fmtDateTime(last.uploadedAt) : "—"}</td>
                    <td><Pill tone={fresh.state === "fresh" ? "valid" : fresh.state === "never" ? "none" : fresh.state === "due" ? "warning" : "error"}>{fresh.label}</Pill></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {onSelect && connection.mode === "file" && connection.active ? <Button onClick={() => onSelect(connection.id)}>Import file</Button> : null}
                        <Button onClick={() => { setAdding(false); setEditing(structuredClone(connection)); }}>Edit</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form ? <ConnectionForm key={form.id || "new"} initial={form} family={family} onCancel={() => { setEditing(null); setAdding(false); }} onSave={save} /> : null}
    </Section>
  );
}

function ConnectionForm({ initial, family, onCancel, onSave }: { initial: Connection; family: ConnectorFamily; onCancel: () => void; onSave: (connection: Connection) => void }) {
  const [draft, setDraft] = useState<Connection>(initial);
  const options = connectors.filter((connector) => connector.family === family);
  const connector = connectorById(draft.connectorId);
  const state = connectionState(draft.mode, draft.verification, SERVER_CONNECTOR_CONFIGURED);
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-navy/10 bg-ivory p-4">
      <h4 className="font-serif text-lg text-navy">{initial.id ? `Edit ${initial.name}` : "New connection"}</h4>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          System
          <select aria-label="System" disabled={Boolean(initial.id)} className={`${inputClass} mt-1 block w-full`} value={draft.connectorId} onChange={(event) => setDraft({ ...draft, connectorId: event.target.value as ConnectorId, mode: "file" })}>
            {options.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          Connection name
          <input aria-label="Connection name" className={`${inputClass} mt-1 block w-full`} value={draft.name} placeholder={`${connector.name} — ${draft.environment}`} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          Environment
          <input aria-label="Environment" className={`${inputClass} mt-1 block w-full`} value={draft.environment} placeholder="Production, Fund II, Test…" onChange={(event) => setDraft({ ...draft, environment: event.target.value })} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          Mode
          <select aria-label="Mode" className={`${inputClass} mt-1 block w-full`} value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as ConnectionMode })}>
            {connector.modes.map((mode) => (
              <option key={mode} value={mode}>{mode === "file" ? "File export (XLSX / XLS / CSV)" : "Direct API (requires server connector)"}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
          Expected refresh
          <select aria-label="Schedule" className={`${inputClass} mt-1 block w-full`} value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value as Schedule })}>
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Active
        </label>
      </div>
      <p className="text-xs text-navy/60">{draft.mode === "file" ? connector.fileNote : connector.apiNote}</p>
      {draft.mode === "api" ? (
        <div className="space-y-2">
          <Notice tone="sky">
            <b>{state.label}.</b> {state.detail} Credentials are never entered here: they belong in the server-side connector’s secret store. Endpoints come from the customer’s approved documentation, not from EstateCFO.
          </Notice>
          <ul className="space-y-1">
            {apiRequirements.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={Boolean(draft.verification[item.id])} onChange={(event) => setDraft({ ...draft, verification: { ...draft.verification, [item.id]: event.target.checked } })} />
                  {item.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button primary onClick={() => onSave(draft)}>Save connection</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
