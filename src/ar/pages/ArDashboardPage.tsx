import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { kpis, monthlyTrend, performance } from "@/ar/engine/analytics";
import { collectionsIntelligence } from "@/ar/engine/intelligence";
import { ageBuckets } from "@/ar/engine/types";
import { loadSample } from "@/ar/service/sample";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, Feedback, Tag, moneyShort } from "@/ar/ui/kit";
import { Button, Notice, Section, Stat, inputClass } from "@/integrations/ui/components";

export function ArDashboardPage() {
  const { book, workspaceId } = useArBook();
  const [asOf, setAsOf] = useState(today());
  const action = useAction();
  if (!book || !workspaceId) return null;
  const empty = book.tenants.length === 0;
  const ccy = book.settings.groupCurrency;
  const k = kpis(book, asOf);
  const byProperty = performance(book, asOf, "property");
  const byEntity = performance(book, asOf, "entity");
  const trend = monthlyTrend(book, asOf);
  const intel = collectionsIntelligence(book, asOf);
  const sample = book.tenants.length > 0 && book.tenants.every((tenant) => tenant.source.system === "Sample data");

  return (
    <ArPage
      title="Real Estate Receivables"
      subtitle="Rent billing, tenant balances, collections, and ageing from the AR ledger. Every figure is calculated from posted invoices, receipts, and credit notes."
      actions={
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-navy/50">
          As of <input type="date" className={inputClass} value={asOf} onChange={(event) => setAsOf(event.target.value || today())} />
        </label>
      }
    >
      <Feedback error={action.error} message={action.message} />
      {empty ? (
        <Section title="Get started" subtitle="The AR ledger has no tenants yet.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-navy/10 p-4 text-sm">
              <p className="font-semibold text-navy">Load the sample portfolio</p>
              <p className="mt-1 text-navy/60">Six tenants across three entities (one billed in EUR), four months of billing, receipts, a credit note, a dispute, and follow-ups. Everything is posted through the normal controls and tagged “Sample data”.</p>
              <div className="mt-3">
                <Button primary disabled={action.busy} onClick={() => action.run(() => loadSample(arService, workspaceId), "Sample portfolio loaded.")}>Load sample portfolio</Button>
              </div>
            </div>
            <div className="rounded-xl border border-navy/10 p-4 text-sm">
              <p className="font-semibold text-navy">Bring in from Yardi, ERP, or Excel</p>
              <p className="mt-1 text-navy/60">Publish tenant master, lease register, rent charges, and open receivables in Data Integrations, then bring them into AR.</p>
              <div className="mt-3"><Link to="/estate/ar/settings" className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Open AR imports</Link></div>
            </div>
            <div className="rounded-xl border border-navy/10 p-4 text-sm">
              <p className="font-semibold text-navy">Start from scratch</p>
              <p className="mt-1 text-navy/60">Add tenants and leases with their rent, CAM, utility, and parking charges, then run monthly billing.</p>
              <div className="mt-3"><Link to="/estate/ar/tenants" className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Open Tenant Register</Link></div>
            </div>
          </div>
        </Section>
      ) : null}
      {sample ? <Notice tone="sky">This ledger holds sample data only. <Button onClick={() => window.confirm("Remove all sample AR records and journals?") && action.run(() => arService.clearSample(workspaceId), "Sample data removed.")}>Remove sample data</Button></Notice> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total rental receivables" value={moneyShort(k.total, ccy)} hint={`${k.openInvoices} open invoice(s)`} to="/estate/ar/ageing" />
        <Stat label="Current" value={moneyShort(k.current, ccy)} hint="Not yet due" tone="green" />
        <Stat label="Overdue" value={moneyShort(k.overdue, ccy)} hint={`${k.overdueInvoices} invoice(s) past due`} tone="red" to="/estate/ar/collections" />
        <Stat label="Collection rate" value={k.collectionRate === null ? "—" : `${k.collectionRate}%`} hint={k.collectionBasis} tone="gold" />
        <Stat label="DSO" value={k.dso === null ? "—" : `${k.dso} days`} hint="Receivables ÷ last 90 days billed × 90" />
        <Stat label="Billed this month" value={moneyShort(k.billedThisMonth, ccy)} hint={`Unbilled contractual rent ${moneyShort(k.unbilled, ccy)}`} to="/estate/ar/billing" />
        <Stat label="Collected this month" value={moneyShort(k.collectedThisMonth, ccy)} hint="Cash received, including unallocated" tone="green" to="/estate/ar/payments" />
        <Stat label="Unallocated receipts" value={moneyShort(k.unallocated, ccy)} hint="Received but not applied to invoices" tone="amber" to="/estate/ar/payments" />
        <Stat label="Disputed receivables" value={moneyShort(k.disputed, ccy)} tone="amber" to="/estate/ar/disputes" />
        <Stat label="Bad debt exposure" value={moneyShort(k.badDebtExposure, ccy)} hint="Ageing × expected loss rates in AR Settings" tone="red" />
      </section>
      <p className="text-xs text-navy/50">Billed revenue, cash collected, outstanding receivables, and unbilled rent are reported separately; security deposits held ({moneyShort(k.depositsHeld, ccy)}) are a liability and excluded from all of them. Amounts in {ccy}; open foreign-currency balances use the closing rate.</p>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Ageing" subtitle={`As of ${asOf}`}>
          <div className="flex h-4 overflow-hidden rounded-full bg-navy/5">
            {ageBuckets.map((bucket, index) => (k.total > 0 ? <div key={bucket} title={`${bucket}: ${moneyShort(k.buckets[bucket], ccy)}`} style={{ width: `${(k.buckets[bucket] / k.total) * 100}%`, backgroundColor: ["#059669", "#F59E0B", "#EA580C", "#DC2626", "#7F1D1D"][index] }} /> : null))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {ageBuckets.map((bucket) => (
              <li key={bucket}>
                <Tag tone={bucket}>{bucket === "Current" ? "Current" : `${bucket} days`}</Tag>
                <p className="mt-1 tabular-nums text-navy">{moneyShort(k.buckets[bucket], ccy)}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Billed vs collected" subtitle="Last six months, by invoice date and receipt date">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => moneyShort(Number(value), ccy)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="billed" name="Billed" fill="#0B1D33" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#C9A227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {([["Property", byProperty], ["Entity", byEntity]] as const).map(([label, rows]) => (
          <Section key={label} title={`Collections by ${label.toLowerCase()}`} subtitle="Invoices dated in the last 3 months; outstanding at the as-of date">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(value: number) => `${Math.round(value / 1000)}K`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => moneyShort(Number(value), ccy)} />
                  <Bar dataKey="collected" name="Collected" stackId="a" fill="#059669" />
                  <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="data-table mt-3 text-xs">
              <thead><tr><th>{label}</th><th className="text-right">Billed</th><th className="text-right">Collected</th><th className="text-right">Rate</th><th className="text-right">Outstanding</th><th className="text-right">Overdue</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}><td className="font-semibold">{row.label}</td><td className="text-right tabular-nums">{moneyShort(row.billed, ccy)}</td><td className="text-right tabular-nums">{moneyShort(row.collected, ccy)}</td><td className="text-right">{row.rate === null ? "—" : `${row.rate}%`}</td><td className="text-right tabular-nums">{moneyShort(row.outstanding, ccy)}</td><td className={`text-right tabular-nums ${row.overdue > 0 ? "!text-red-700" : ""}`}>{moneyShort(row.overdue, ccy)}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        ))}
      </div>

      <Section title="Collections intelligence" subtitle={intel.basis} actions={<Link to="/estate/ar/collections" className="text-xs font-semibold underline">Open collections worklist</Link>}>
        {intel.insights.length === 0 ? <p className="text-sm text-navy/60">No collection risks detected in the posted records.</p> : (
          <ul className="space-y-2">
            {intel.insights.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-start gap-3 text-sm"><Tag tone={item.severity}>{item.severity}</Tag><span><b className="text-navy">{item.title}.</b> <span className="text-navy/70">{item.detail}</span></span></li>
            ))}
          </ul>
        )}
      </Section>
    </ArPage>
  );
}
