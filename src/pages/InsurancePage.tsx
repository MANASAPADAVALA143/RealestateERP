import { AiInsights } from "@/components/AiInsights";
import { InsuranceRisk } from "@/components/InsuranceRisk";
import { KpiCard, Lede, Panel, PolicyBadge } from "@/components/ui";
import { inrCr, insights, policies } from "@/lib/demoData";

export function InsurancePage() {
  const coverage = policies.reduce((sum, policy) => sum + policy.coverage, 0);
  const premium = policies.reduce((sum, policy) => sum + policy.premium, 0);
  const expiring = policies.filter((policy) => policy.status === "Expiring").length;
  const watch = policies.filter((policy) => policy.status === "Watch").length;

  return (
    <div className="space-y-6">
      <Lede>
        Eight policies across fire, engineering, liability, health, and workmen compensation. Two renewals fall
        before December, and one contractors all-risk claim is still open.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Policies" value={String(policies.length)} hint="Active schedule for the group" />
        <KpiCard label="Sum insured" value={inrCr(coverage)} hint="Aggregate cover, not a loss limit" accent="gold" />
        <KpiCard label="Annual premium" value={inrCr(premium)} hint="Premium on the current schedule" />
        <KpiCard
          label="Needs a decision"
          value={String(expiring + watch)}
          hint={`${expiring} expiring · ${watch} on watch`}
          accent="alert"
        />
      </section>

      <Panel
        title="Policy register"
        subtitle="Insurer, entity, type, cover, premium, expiry, status, and claim position."
        bleed
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1040px]">
            <thead>
              <tr>
                <th>Insurer</th>
                <th>Entity</th>
                <th>Type</th>
                <th className="text-right">Coverage</th>
                <th className="text-right">Premium</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Claim</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.id}
                  className={
                    policy.status === "Expiring" ? "bg-amber-50/60" : policy.status === "Watch" ? "bg-orange-50/50" : ""
                  }
                >
                  <td className="font-medium">{policy.insurer}</td>
                  <td>
                    <span className="font-semibold">{policy.entityId}</span>
                    <span className="mt-0.5 block text-xs text-navy/55">{policy.entityName}</span>
                  </td>
                  <td>{policy.type}</td>
                  <td className="text-right tabular-nums">{inrCr(policy.coverage)}</td>
                  <td className="text-right tabular-nums">{inrCr(policy.premium)}</td>
                  <td className="whitespace-nowrap">{policy.expiry}</td>
                  <td>
                    <PolicyBadge status={policy.status} />
                  </td>
                  <td className={policy.claim.startsWith("Open") ? "font-medium text-red-700" : "text-navy/70"}>
                    {policy.claim}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Schedule</td>
                <td className="text-right tabular-nums">{inrCr(coverage)}</td>
                <td className="text-right tabular-nums">{inrCr(premium)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <InsuranceRisk />
      <AiInsights page="Insurance" insights={insights.Insurance} />
    </div>
  );
}
