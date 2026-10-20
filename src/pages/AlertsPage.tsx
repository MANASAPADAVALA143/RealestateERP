import { AiInsights } from "@/components/AiInsights";
import { Lede, ModuleBadge, SeverityBadge } from "@/components/ui";
import { alerts, insights, type AlertSeverity } from "@/lib/demoData";

const order: AlertSeverity[] = ["Critical", "High", "Medium", "Low"];

const cardTone: Record<AlertSeverity, string> = {
  Critical: "border-red-200 bg-red-50/40",
  High: "border-orange-200 bg-orange-50/30",
  Medium: "border-gold/30 bg-gold/5",
  Low: "border-navy/10 bg-white",
};

export function AlertsPage() {
  const counts = {
    Critical: alerts.filter((alert) => alert.severity === "Critical").length,
    High: alerts.filter((alert) => alert.severity === "High").length,
    Medium: alerts.filter((alert) => alert.severity === "Medium").length,
    Low: alerts.filter((alert) => alert.severity === "Low").length,
  };

  const ordered = [...alerts].sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  );

  return (
    <div className="space-y-6">
      <Lede>
        {alerts.length} open items, ordered by severity. Two are Critical and due inside the next eight days. Nothing
        on this page changes the books. It is a read-only action list.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {order.map((severity) => (
          <article
            key={severity}
            className={`rounded-2xl border bg-white p-4 shadow-card ${
              severity === "Critical"
                ? "border-red-200"
                : severity === "High"
                  ? "border-orange-200"
                  : severity === "Medium"
                    ? "border-gold/40"
                    : "border-navy/10"
            }`}
          >
            <SeverityBadge severity={severity} />
            <p className="mt-3 font-serif text-4xl leading-none text-navy">{counts[severity]}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-navy/50">Open {severity}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        {ordered.map((alert) => (
          <article key={alert.id} className={`rounded-2xl border p-4 shadow-card md:p-5 ${cardTone[alert.severity]}`}>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <ModuleBadge module={alert.module} />
              <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-navy ring-1 ring-inset ring-navy/10">
                {alert.entityId} · {alert.entityName}
              </span>
              <span className="ml-auto text-xs font-medium uppercase tracking-[0.12em] text-navy/50">
                Due {alert.dueDate}
              </span>
            </div>
            <h2 className="mt-3 font-serif text-xl text-navy">{alert.title}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-navy/75">{alert.description}</p>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-navy">
              <span className="font-semibold">Action. </span>
              {alert.action}
            </p>
          </article>
        ))}
      </section>

      <AiInsights page="Alerts" insights={insights.Alerts} />
    </div>
  );
}
