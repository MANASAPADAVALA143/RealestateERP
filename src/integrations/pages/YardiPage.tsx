import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, UploadCloud } from "lucide-react";
import { categoryGroups, yardiCategories } from "@/integrations/engine/categories";
import { connectorById } from "@/integrations/engine/connectors";
import { templateWorkbook } from "@/integrations/engine/files";
import type { CategoryId } from "@/integrations/engine/types";
import { Button, IntegrationPage, Notice, Pill, StorageNotice, useJobs } from "@/integrations/ui/components";
import { ConnectionsPanel, useConnections } from "@/integrations/ui/connections";
import { download } from "@/integrations/ui/hooks";
import { ImportWizard } from "@/integrations/ui/ImportWizard";

export function YardiPage() {
  const { workspace, connections } = useConnections("Yardi");
  const yardiIds = new Set(connections.map((item) => item.id));
  const jobs = (useJobs(workspace?.tenantId).data ?? []).filter((job) => yardiIds.has(job.connectionId) && job.status !== "Withdrawn");
  const [active, setActive] = useState<CategoryId | null>(null);
  const [connectionId, setConnectionId] = useState<string | undefined>();

  return (
    <IntegrationPage title="Yardi Voyager" subtitle="Import reports exported from Yardi Voyager 8 as Excel or CSV, one connection per Yardi environment. Every customer’s report layout can differ, so each import is mapped and confirmed before it is saved.">
      <StorageNotice />
      <Notice tone="sky">
        <b>Connection mode: file export.</b> Direct Yardi connectivity is not configured and is not simulated. It needs the customer’s approved Yardi interface, written authorization, and a server-side connector. Set a Yardi connection to API mode to track its verification checklist.
      </Notice>

      <ConnectionsPanel family="Yardi" title="Yardi environments" selectedId={connectionId} onSelect={(id) => { setConnectionId(id); setActive(active ?? "gl_transactions"); }} />

      {active ? (
        <div className="space-y-2" id="yardi-wizard">
          <Button onClick={() => setActive(null)}>← All Yardi import categories</Button>
          <ImportWizard key={`${active}-${connectionId ?? ""}`} initialCategory={active} lockCategory family="Yardi" initialConnectionId={connectionId} />
        </div>
      ) : (
        categoryGroups.map((group) => (
          <section key={group} className="space-y-3">
            <h3 className="font-serif text-xl text-navy">{group}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {yardiCategories
                .filter((category) => category.group === group)
                .map((category) => {
                  const last = jobs.find((job) => job.category === category.id);
                  return (
                    <article key={category.id} className="flex flex-col rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-navy">{category.label}</h4>
                        {last ? <Pill tone={last.status}>{last.status === "Imported - exceptions open" ? "Exceptions" : last.status}</Pill> : <Pill tone="none">Not imported</Pill>}
                      </div>
                      <p className="mt-1 text-xs text-navy/60">{category.description}</p>
                      <p className="mt-2 text-[11px] text-navy/50">Required: {category.fields.filter((field) => field.required).map((field) => field.label).join(", ")}</p>
                      {last ? <p className="mt-1 text-[11px] text-navy/50">Last: <Link to={`/data-integrations/history/${last.id}`} className="underline">{last.fileName}</Link> · {last.successfulRecords} records</p> : null}
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        <Button primary onClick={() => setActive(category.id)}>
                          <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" /> Upload file
                        </Button>
                        <Button onClick={() => download(`yardi_${category.id}_template.xlsx`, templateWorkbook(category), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>
                          <Download className="h-3.5 w-3.5" aria-hidden="true" /> Sample template
                        </Button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        ))
      )}
      <p className="text-xs text-navy/50">
        Adapter: {connectorById("yardi_voyager_8").name} column dictionary (Property, Post Month, Control, Resident…). Test files are available under <a href="/samples/property_master_100.xlsx" className="underline">/samples</a>.
      </p>
    </IntegrationPage>
  );
}
