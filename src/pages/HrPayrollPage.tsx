import { AiInsights } from "@/components/AiInsights";
import { KpiCard, Lede, Panel } from "@/components/ui";
import { entityById, group, headcount, inrCr, insights, pct } from "@/lib/demoData";

export function HrPayrollPage() {
  const people = headcount.reduce((sum, row) => sum + row.people, 0);
  const monthly = headcount.reduce((sum, row) => sum + row.monthlyPayroll, 0);
  const annual = monthly * 12;
  const roles = headcount.reduce((sum, row) => sum + row.openRoles, 0);
  const attrition = headcount.reduce((sum, row) => sum + row.attrition * row.people, 0) / people;
  const maxPay = Math.max(...headcount.map((row) => row.monthlyPayroll));

  return (
    <div className="space-y-6">
      <Lede>
        Group workforce and the monthly payroll bill. The annual run-rate is twelve times that bill, set against {inrCr(group.revenue)} of revenue.
      </Lede>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Headcount" value={people.toLocaleString("en-IN")} hint="Employees. Contractors sit outside this count." />
        <KpiCard label="Payroll run-rate" value={inrCr(annual)} hint={`${inrCr(monthly)} this month · ${pct((annual / group.revenue) * 100)} of revenue`} accent="gold" />
        <KpiCard label="Attrition" value={pct(attrition)} hint="Headcount-weighted, trailing twelve months" accent="alert" />
        <KpiCard label="Open roles" value={String(roles)} hint="Twelve of them are on AHS sites" />
      </section>

      <Panel title="Monthly payroll by entity" subtitle="AHS and AFM carry the site rolls. PHC is a small holdco team.">
        <ul className="space-y-3">
          {headcount.map((row) => {
            const entity = entityById(row.entityId);
            return (
              <li key={row.entityId} className="grid items-center gap-3 sm:grid-cols-[9rem_1fr_5.5rem]">
                <span className="text-sm font-medium text-navy">
                  {entity.code}
                  <span className="ml-2 text-xs font-normal text-navy/50">{row.people.toLocaleString("en-IN")}</span>
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(row.monthlyPayroll / (maxPay * 1.08)) * 100}%` }} />
                </div>
                <span className="text-sm font-semibold tabular-nums text-navy sm:text-right">{inrCr(row.monthlyPayroll)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Workforce register" subtitle="People, monthly payroll, attrition, and open roles." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>Entity</th>
                <th className="text-right">Headcount</th>
                <th className="text-right">Monthly payroll</th>
                <th className="text-right">Attrition</th>
                <th className="text-right">Open roles</th>
              </tr>
            </thead>
            <tbody>
              {headcount.map((row) => {
                const entity = entityById(row.entityId);
                return (
                  <tr key={row.entityId} className={row.attrition >= 10 ? "bg-amber-50/40" : ""}>
                    <td>
                      <p className="font-semibold">{entity.code}</p>
                      <p className="text-xs text-navy/55">{entity.name}</p>
                    </td>
                    <td className="text-right tabular-nums">{row.people.toLocaleString("en-IN")}</td>
                    <td className="text-right tabular-nums">{inrCr(row.monthlyPayroll)}</td>
                    <td className="text-right tabular-nums">{pct(row.attrition)}</td>
                    <td className="text-right tabular-nums">{row.openRoles}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Group</td>
                <td className="text-right tabular-nums">{people.toLocaleString("en-IN")}</td>
                <td className="text-right tabular-nums">{inrCr(monthly)}</td>
                <td className="text-right tabular-nums">{pct(attrition)}</td>
                <td className="text-right tabular-nums">{roles}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <AiInsights page="HR & Payroll" insights={insights["HR & Payroll"]} />
    </div>
  );
}
