import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";
import { ageing, balances, collectionsByBank, kpis, monthRange, performance, subledgerSummary, tenantBalances } from "@/ar/engine/analytics";
import { addDays, monthStart } from "@/ar/engine/dates";
import { contractualMonthly } from "@/ar/engine/billing";
import type { ArBook } from "@/ar/engine/types";
import { collectionsIntelligence } from "@/ar/engine/intelligence";
import { today, useArBook } from "@/ar/ui/hooks";
import { Tag, money, moneyShort } from "@/ar/ui/kit";
import { inputClass } from "@/integrations/ui/components";

export function LedgerPanel({ title, subtitle, children, to = "/estate/ar", actions }: { title: string; subtitle?: ReactNode; children: ReactNode; to?: string; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-emerald-700/25 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-700/10 bg-emerald-50/50 px-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> Real Estate AR ledger · posted records
          </p>
          <h3 className="mt-1 font-serif text-xl text-navy">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-navy/60">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <Link to={to} className="text-xs font-semibold text-navy underline">Open Receivables</Link>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-emerald-700/30 bg-emerald-50/30 px-5 py-4 text-sm text-navy/70">
      <span><b className="text-navy">No Real Estate AR ledger yet.</b> {what}</span>
      <Link to="/estate/ar" className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Set up receivables</Link>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" | "amber" }) {
  const color = tone === "red" ? "text-red-700" : tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-navy";
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-navy/45">{label}</p>
      <p className={`mt-1 font-serif text-xl tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function useLedger(): ArBook | null | undefined {
  const { book } = useArBook();
  if (!book) return undefined;
  return book.tenants.length ? book : null;
}

/** CEO Dashboard and group Receivables: group receivables, collection performance, and overdue exposure. */
export function ArGroupSummary({ entityId, title = "Real estate receivables" }: { entityId?: string; title?: string }) {
  const book = useLedger();
  if (book === undefined) return null;
  if (book === null) return <Empty what="Rent receivables will appear here once tenants and invoices are posted." />;
  const asOf = today();
  const scope = entityId ? { entityId } : {};
  const k = kpis(book, asOf, scope);
  const ccy = k.currency;
  const intel = collectionsIntelligence(book, asOf, scope);
  return (
    <LedgerPanel title={title} subtitle={`As of ${asOf} · ${ccy}${entityId ? ` · entity ${entityId}` : " · all entities"}`}>
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Figure label="Total receivables" value={moneyShort(k.total, ccy)} />
        <Figure label="Overdue" value={moneyShort(k.overdue, ccy)} tone={k.overdue ? "red" : undefined} />
        <Figure label="90+ days" value={moneyShort(k.buckets["90+"], ccy)} tone={k.buckets["90+"] ? "red" : undefined} />
        <Figure label="Collected this month" value={moneyShort(k.collectedThisMonth, ccy)} tone="green" />
        <Figure label="Collection rate (90 days)" value={k.collectionRate === null ? "—" : `${k.collectionRate}%`} />
        <Figure label="Bad debt exposure" value={moneyShort(k.badDebtExposure, ccy)} tone="amber" />
      </div>
      {intel.priorities.length ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/50">Collection risk</p>
          <ul className="mt-2 space-y-1 text-sm">
            {intel.priorities.slice(0, 3).map((row) => (
              <li key={row.tenantId} className="flex flex-wrap items-center gap-2">
                <Link to={`/estate/ar/tenants/${encodeURIComponent(row.tenantId)}`} className="font-semibold text-navy underline-offset-2 hover:underline">{row.tenantName}</Link>
                <span className="text-navy/60">{row.propertyName} · {moneyShort(row.overdue, ccy)} overdue · oldest {row.oldestDays} days</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </LedgerPanel>
  );
}

/** Companies: receivables by legal entity. */
export function ArEntityTable() {
  const book = useLedger();
  if (book === undefined) return null;
  if (book === null) return <Empty what="Entity-level rent receivables appear here once the AR ledger has postings." />;
  const asOf = today();
  const rows = performance(book, asOf, "entity");
  const ccy = book.settings.groupCurrency;
  return (
    <LedgerPanel title="Receivables by legal entity" subtitle={`Invoices dated in the last 3 months; outstanding as of ${asOf} · ${ccy}`} to="/estate/ar/ageing">
      <table className="data-table text-sm">
        <thead><tr><th>Entity</th><th className="text-right">Billed</th><th className="text-right">Collected</th><th className="text-right">Rate</th><th className="text-right">Outstanding</th><th className="text-right">Overdue</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.key}><td className="font-semibold">{row.label}</td><td className="text-right tabular-nums">{moneyShort(row.billed, ccy)}</td><td className="text-right tabular-nums">{moneyShort(row.collected, ccy)}</td><td className="text-right">{row.rate === null ? "—" : `${row.rate}%`}</td><td className="text-right tabular-nums">{moneyShort(row.outstanding, ccy)}</td><td className={`text-right tabular-nums ${row.overdue ? "!text-red-700" : ""}`}>{moneyShort(row.overdue, ccy)}</td></tr>)}</tbody>
      </table>
    </LedgerPanel>
  );
}

/** Rentals: lease rent roll, occupancy by lease, billed and collected this month. */
export function ArRentRoll() {
  const book = useLedger();
  if (book === undefined) return null;
  if (book === null) return <Empty what="Tenant, unit, and lease rent will appear here from the Tenant Register." />;
  const asOf = today();
  const month = asOf.slice(0, 7);
  const ccy = book.settings.groupCurrency;
  const open = balances(book, asOf);
  const rows = new Map<string, { name: string; units: Set<string>; leased: number; contractual: number; billed: number; collected: number; outstanding: number }>();
  for (const lease of book.leases) {
    const row = rows.get(lease.propertyId) ?? { name: lease.propertyName || lease.propertyId, units: new Set<string>(), leased: 0, contractual: 0, billed: 0, collected: 0, outstanding: 0 };
    row.units.add(lease.unit);
    if (lease.status === "Active" && lease.start <= asOf && lease.end >= asOf) {
      row.leased += 1;
      const rate = lease.currency === ccy ? 1 : book.settings.fxRates.filter((item) => item.currency === lease.currency && item.period <= month).sort((a, b) => b.period.localeCompare(a.period))[0]?.rate ?? 0;
      row.contractual += contractualMonthly(lease, asOf) * rate;
    }
    rows.set(lease.propertyId, row);
  }
  for (const balance of open.values()) {
    const row = rows.get(balance.invoice.propertyId);
    if (!row) continue;
    const rate = balance.invoice.fx?.rateToGroup ?? 1;
    if (balance.invoice.invoiceDate.slice(0, 7) === month && balance.invoice.kind !== "imported") {
      row.billed += balance.invoice.total * rate;
      row.collected += balance.collected * rate;
    }
    row.outstanding += balance.outstanding * rate;
  }
  return (
    <LedgerPanel title="Lease rent roll" subtitle={`From the Real Estate AR Tenant Register and leases · ${month} · ${ccy}`} to="/estate/ar/leases">
      <table className="data-table text-sm">
        <thead><tr><th>Property</th><th className="text-right">Units on leases</th><th className="text-right">Active leases</th><th className="text-right">Contractual rent / month</th><th className="text-right">Billed this month</th><th className="text-right">Collected on those</th><th className="text-right">Outstanding</th></tr></thead>
        <tbody>{[...rows.entries()].map(([id, row]) => <tr key={id}><td className="font-semibold">{row.name}</td><td className="text-right">{row.units.size}</td><td className="text-right">{row.leased}</td><td className="text-right tabular-nums">{moneyShort(row.contractual, ccy)}</td><td className="text-right tabular-nums">{moneyShort(row.billed, ccy)}</td><td className="text-right tabular-nums">{moneyShort(row.collected, ccy)}</td><td className="text-right tabular-nums">{moneyShort(row.outstanding, ccy)}</td></tr>)}</tbody>
      </table>
      <p className="mt-2 text-xs text-navy/50">Contractual rent is the monthly equivalent of every recurring charge on active leases; billed and collected come from posted invoices and receipts. Occupancy for units without a lease is not inferred.</p>
    </LedgerPanel>
  );
}

/** Financial Statements: rental revenue, AR, bad debt, credit notes, deposits from AR journals. */
export function ArStatementsPanel({ entityId }: { entityId?: string }) {
  const book = useLedger();
  const [period, setPeriod] = useState(today().slice(0, 7));
  if (book === undefined) return null;
  if (book === null) return <Empty what="Rental revenue, receivables, credit notes, and bad debt from the AR ledger will appear here." />;
  const { from, to } = monthRange(period);
  const scope = entityId ? { entityId } : {};
  const month = subledgerSummary(book, from, to, scope);
  const ytd = subledgerSummary(book, `${period.slice(0, 4)}-01-01`, to, scope);
  const ccy = month.currency;
  const row = (label: string, a: number, b: number, strong = false) => <tr className={strong ? "font-semibold" : ""}><td>{label}</td><td className="text-right tabular-nums">{money(a, ccy)}</td><td className="text-right tabular-nums">{money(b, ccy)}</td></tr>;
  return (
    <LedgerPanel title="Receivables subledger" subtitle={`${entityId ? `Entity ${entityId} · ` : ""}${ccy}. Kept separate from the imported or printed statements above so nothing is counted twice; reconcile the AR line to it.`} to="/estate/ar/reports" actions={<input aria-label="Subledger month" type="month" className={`${inputClass} py-1 text-xs`} value={period} onChange={(event) => setPeriod(event.target.value || today().slice(0, 7))} />}>
      <table className="data-table max-w-3xl text-sm">
        <thead><tr><th /><th className="text-right">{period}</th><th className="text-right">Year to date</th></tr></thead>
        <tbody>
          {row("Rental revenue billed (gross)", month.grossBilled, ytd.grossBilled)}
          {row("Credit notes", -month.creditNotes, -ytd.creditNotes)}
          {row("Net rental revenue", month.netRevenue, ytd.netRevenue, true)}
          {row("Bad debt expense", month.badDebt, ytd.badDebt)}
          {row("FX gain / (loss) on tenant receipts", month.fx, ytd.fx)}
          {row("Cash collected", month.cashCollected, ytd.cashCollected)}
        </tbody>
        <tfoot>
          <tr><td>Tenant receivables at {to}</td><td className="text-right tabular-nums" colSpan={2}>{money(month.receivables, ccy)}</td></tr>
          <tr><td>Security deposits held (liability)</td><td className="text-right tabular-nums" colSpan={2}>{money(month.deposits, ccy)}</td></tr>
          <tr><td>Unapplied receipts (liability)</td><td className="text-right tabular-nums" colSpan={2}>{money(month.unapplied, ccy)}</td></tr>
        </tfoot>
      </table>
    </LedgerPanel>
  );
}

/** Cash Overview: actual tenant collections and bank receipts, and expected collections. */
export function ArCashPanel() {
  const book = useLedger();
  if (book === undefined) return null;
  if (book === null) return <Empty what="Actual tenant collections by bank account will appear here." />;
  const asOf = today();
  const ccy = book.settings.groupCurrency;
  const from = monthStart(asOf.slice(0, 7));
  const banks = collectionsByBank(book, from, asOf);
  const last30 = collectionsByBank(book, addDays(asOf, -30), asOf);
  const intel = collectionsIntelligence(book, asOf);
  const k = kpis(book, asOf);
  return (
    <LedgerPanel title="Tenant collections" subtitle={`Receipts posted in the AR ledger · ${ccy}`} to="/estate/ar/payments">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <table className="data-table text-sm">
            <thead><tr><th>Bank account</th><th className="text-right">Rent receipts MTD</th><th className="text-right">Deposits MTD</th><th className="text-right">Last 30 days</th></tr></thead>
            <tbody>{[...new Set([...banks, ...last30].map((row) => row.bankAccount))].map((name) => {
              const month = banks.find((row) => row.bankAccount === name);
              const recent = last30.find((row) => row.bankAccount === name);
              return <tr key={name}><td className="font-semibold">{name}</td><td className="text-right tabular-nums">{moneyShort(month?.receipts ?? 0, ccy)}</td><td className="text-right tabular-nums">{moneyShort(month?.deposits ?? 0, ccy)}</td><td className="text-right tabular-nums">{moneyShort((recent?.receipts ?? 0) + (recent?.deposits ?? 0), ccy)}</td></tr>;
            })}</tbody>
          </table>
          <p className="mt-2 text-xs text-navy/50">Unallocated receipts {moneyShort(k.unallocated, ccy)} are cash in the bank not yet applied to invoices. Deposits are held as a liability.</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/50">Expected tenant collections</p>
          <table className="data-table mt-1 text-sm"><tbody>{intel.expected.buckets.map((bucket) => <tr key={bucket.label}><td>{bucket.label}</td><td className="text-right tabular-nums">{moneyShort(bucket.amount, ccy)}</td></tr>)}<tr><td className="!text-red-700">At risk (not forecast)</td><td className="text-right tabular-nums !text-red-700">{moneyShort(intel.expected.atRisk, ccy)}</td></tr></tbody></table>
          <p className="mt-2 text-xs text-navy/50">{intel.expected.basis}</p>
        </div>
      </div>
    </LedgerPanel>
  );
}

/** AI Financial Analyst: collection trends, overdue tenant risk, property analysis. */
export function ArAnalystPanel() {
  const book = useLedger();
  if (book === undefined) return null;
  if (book === null) return <Empty what="Collections intelligence runs on posted AR records." />;
  const asOf = today();
  const ccy = book.settings.groupCurrency;
  const intel = collectionsIntelligence(book, asOf);
  const properties = performance(book, asOf, "property");
  return (
    <LedgerPanel title="Collections intelligence" subtitle={intel.basis} to="/estate/ar/collections">
      <div className="grid gap-5 xl:grid-cols-2">
        <ul className="space-y-2 text-sm">
          {intel.insights.length === 0 ? <li className="text-navy/60">No collection risks detected.</li> : intel.insights.slice(0, 8).map((item) => <li key={item.id} className="flex items-start gap-2"><Tag tone={item.severity}>{item.severity}</Tag><span><b>{item.title}.</b> <span className="text-navy/70">{item.detail}</span></span></li>)}
        </ul>
        <table className="data-table text-xs">
          <thead><tr><th>Property</th><th className="text-right">Collection rate (3 mo)</th><th className="text-right">Outstanding</th><th className="text-right">Overdue</th></tr></thead>
          <tbody>{properties.map((row) => <tr key={row.key}><td className="font-semibold">{row.label}</td><td className="text-right">{row.rate === null ? "—" : `${row.rate}%`}</td><td className="text-right tabular-nums">{moneyShort(row.outstanding, ccy)}</td><td className={`text-right tabular-nums ${row.overdue ? "!text-red-700" : ""}`}>{moneyShort(row.overdue, ccy)}</td></tr>)}</tbody>
        </table>
      </div>
    </LedgerPanel>
  );
}

/** Meridian Accounts Receivable: the property-specific view of the same AR ledger. */
export function EntityReceivables({ entityId, entityName }: { entityId: string; entityName: string }) {
  const { book } = useArBook();
  const [asOf, setAsOf] = useState(today());
  if (!book) return null;
  const scope = { entityId };
  const rows = ageing(book, asOf, scope);
  if (!book.invoices.some((invoice) => invoice.entityId === entityId)) return null;
  const k = kpis(book, asOf, scope);
  const ccy = k.currency;
  const owed = tenantBalances(book, asOf);
  const tenants = book.tenants.filter((tenant) => tenant.entityId === entityId);
  const byProperty = performance(book, asOf, "property").filter((row) => book.invoices.some((invoice) => invoice.entityId === entityId && invoice.propertyId === row.key));
  return (
    <LedgerPanel title={`${entityName} receivables`} subtitle={`AR ledger for entity ${entityId} · ${ccy}`} to="/estate/ar/ageing" actions={<input aria-label="Ageing as of" type="date" className={`${inputClass} py-1 text-xs`} value={asOf} onChange={(event) => setAsOf(event.target.value || today())} />}>
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Figure label="Outstanding" value={moneyShort(k.total, ccy)} />
        <Figure label="Current" value={moneyShort(k.current, ccy)} tone="green" />
        <Figure label="Overdue" value={moneyShort(k.overdue, ccy)} tone={k.overdue ? "red" : undefined} />
        <Figure label="Collected this month" value={moneyShort(k.collectedThisMonth, ccy)} tone="green" />
        <Figure label="Disputed" value={moneyShort(k.disputed, ccy)} tone="amber" />
        <Figure label="Deposits held" value={moneyShort(k.depositsHeld, ccy)} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <table className="data-table text-sm">
          <thead><tr><th>Tenant</th><th>Property · unit</th><th className="text-right">Outstanding</th><th className="text-right">Overdue</th></tr></thead>
          <tbody>{tenants.map((tenant) => <tr key={tenant.id}><td><Link to={`/estate/ar/tenants/${encodeURIComponent(tenant.id)}`} className="font-semibold underline-offset-2 hover:underline">{tenant.name}</Link></td><td>{tenant.propertyName || tenant.propertyId} · {tenant.unit}</td><td className="text-right tabular-nums">{money(owed.get(tenant.id)?.outstanding ?? 0, tenant.currency)}</td><td className={`text-right tabular-nums ${owed.get(tenant.id)?.overdue ? "!text-red-700" : ""}`}>{money(owed.get(tenant.id)?.overdue ?? 0, tenant.currency)}</td></tr>)}</tbody>
        </table>
        <table className="data-table text-sm">
          <thead><tr><th>Property</th><th className="text-right">Collection rate</th><th className="text-right">Outstanding</th></tr></thead>
          <tbody>{byProperty.map((row) => <tr key={row.key}><td className="font-semibold">{row.label}</td><td className="text-right">{row.rate === null ? "—" : `${row.rate}%`}</td><td className="text-right tabular-nums">{moneyShort(row.outstanding, ccy)}</td></tr>)}</tbody>
        </table>
      </div>
      <table className="data-table mt-5 text-xs">
        <thead><tr><th>Invoice</th><th>Tenant</th><th>Due</th><th className="text-right">Days past due</th><th>Bucket</th><th className="text-right">Outstanding</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.invoice.id}><td><Link to={`/estate/ar/invoices/${encodeURIComponent(row.invoice.id)}`} className="font-semibold underline">{row.invoice.number}</Link></td><td>{row.tenantName}</td><td>{row.invoice.dueDate}</td><td className="text-right">{Math.max(row.daysPastDue, 0)}</td><td><Tag tone={row.bucket}>{row.bucket}</Tag></td><td className="text-right tabular-nums">{money(row.outstanding, row.invoice.currency)}</td></tr>)}</tbody>
      </table>
    </LedgerPanel>
  );
}
