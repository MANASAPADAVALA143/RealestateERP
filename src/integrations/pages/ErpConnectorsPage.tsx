import { useState } from "react";
import { Building } from "lucide-react";
import { categories } from "@/integrations/engine/categories";
import { connectors } from "@/integrations/engine/connectors";
import { Button, IntegrationPage, Notice, Pill, StorageNotice } from "@/integrations/ui/components";
import { ConnectionsPanel, useConnections } from "@/integrations/ui/connections";
import { ImportWizard } from "@/integrations/ui/ImportWizard";

export function ErpConnectorsPage() {
  const { connections } = useConnections("ERP");
  const [selected, setSelected] = useState<string | null>(null);
  const erps = connectors.filter((connector) => connector.family === "ERP");

  return (
    <IntegrationPage title="ERP Connectors" subtitle="SAP, Oracle, NetSuite, and Dynamics 365 adapters transform exported files into the EstateCFO Common Data Model. Direct API access is prepared but not active.">
      <StorageNotice />
      <Notice tone="sky">
        <b>Available now:</b> import from ERP export files through each system’s adapter. <b>Not available:</b> direct API connectivity. Every API connection stays “Not connected” until a server-side connector is deployed, authorized by the customer, and passes a tested extraction.
      </Notice>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {erps.map((connector) => {
          const count = connections.filter((item) => item.connectorId === connector.id).length;
          const mapped = Object.keys(connector.aliases);
          return (
            <article key={connector.id} className="flex flex-col rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-gold"><Building className="h-4 w-4" aria-hidden="true" /></span>
                <div>
                  <h3 className="font-semibold text-navy">{connector.name}</h3>
                  <p className="text-[11px] text-navy/50">{connector.vendor}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Pill tone="valid">File adapter ready</Pill>
                <Pill tone="warning">API not connected</Pill>
              </div>
              <p className="mt-2 text-xs text-navy/60">{connector.fileNote}</p>
              <p className="mt-2 text-[11px] text-navy/50">Adapter column dictionary: {mapped.length ? mapped.map((id) => categories.find((category) => category.id === id)?.label).join(", ") : "general"}{connector.derive ? " · derives debit/credit from the export’s amount convention" : ""}.</p>
              <p className="mt-auto pt-3 text-xs font-semibold text-navy">{count} connection(s)</p>
            </article>
          );
        })}
      </section>
      <p className="text-xs text-navy/50">The connector registry is extensible: a new ERP is one adapter entry (column dictionary, optional derivation, and API notes) in <code>src/integrations/engine/connectors.ts</code>. Its data then flows through the same mapping, validation, and Common Data Model.</p>

      <ConnectionsPanel family="ERP" title="ERP connections" onSelect={setSelected} selectedId={selected ?? undefined} />

      {selected ? (
        <div className="space-y-2">
          <Button onClick={() => setSelected(null)}>Close import</Button>
          <ImportWizard key={selected} initialCategory="gl_transactions" family="ERP" initialConnectionId={selected} categoryOptions={categories.filter((category) => category.group !== "IFRS 16 Engine").map((category) => category.id)} />
        </div>
      ) : connections.length === 0 ? (
        <Notice>Add an ERP connection (for example “SAP S/4HANA — Group”) to import its exports.</Notice>
      ) : null}
    </IntegrationPage>
  );
}
