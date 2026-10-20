import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import {
  capexAvailable,
  capexBudget,
  capexCommitted,
  capexProjects,
  capexSpent,
  entityById,
  inrCr,
  insights,
  pct,
} from "@/lib/demoData";

const statusClass: Record<string, string> = {
  "On track": "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Watch: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Delayed: "bg-red-50 text-red-800 ring-red-700/15",
};

export function ProjectsCapexPage() {
  const onTrack = capexProjects.filter((project) => project.status === "On track").length;
  const watch = capexProjects.filter((project) => project.status === "Watch").length;
  const delayed = capexProjects.filter((project) => project.status === "Delayed").length;

  return (
    <div className="space-y-6">
      <Lede>
        FY26 project budget. Spent plus committed plus available equals {inrCr(capexBudget)}. {onTrack} projects are on track, {watch} are on watch, and {delayed} is delayed.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="FY26 budget" value={inrCr(capexBudget)} hint={`${capexProjects.length} active projects`} />
        <KpiCard label="Spent" value={inrCr(capexSpent)} hint={`${pct((capexSpent / capexBudget) * 100)} of the budget`} accent="gold" />
        <KpiCard label="Committed" value={inrCr(capexCommitted)} hint="Purchase orders and contracts not yet spent" />
        <KpiCard label="Available" value={inrCr(capexAvailable)} hint="Budget not yet committed" />
      </section>

      <Panel title="Project register" subtitle="Budget against cost to date. The bar is spend divided by budget.">
        <ul className="space-y-4">
          {capexProjects.map((project) => {
            const entity = entityById(project.entityId);
            const used = (project.spent / project.budget) * 100;
            return (
              <li key={project.id} className="rounded-xl border border-navy/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy">{project.name}</p>
                    <p className="text-xs text-navy/55">
                      {entity.code} · {project.place} · {project.finish}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusClass[project.status]}`}>
                    {project.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p><span className="text-navy/50">Budget </span><span className="font-semibold tabular-nums">{inrCr(project.budget)}</span></p>
                  <p><span className="text-navy/50">Spent </span><span className="font-semibold tabular-nums">{inrCr(project.spent)}</span></p>
                  <p><span className="text-navy/50">Left </span><span className="font-semibold tabular-nums">{inrCr(project.budget - project.spent)}</span></p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(used, 100)}%`, backgroundColor: project.status === "On track" ? "#0B1D33" : "#C79A2B" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <AiInsights page="Projects & Capex" insights={insights["Projects & Capex"]} />
    </div>
  );
}
