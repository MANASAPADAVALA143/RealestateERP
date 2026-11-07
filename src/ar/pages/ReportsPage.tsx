import { useState } from "react";
import { ageing, monthRange, subledgerSummary } from "@/ar/engine/analytics";
import { trialBalance } from "@/ar/engine/ledger";
import { arService, today, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Field, SmallButton, Table, money, nameMaps } from "@/ar/ui/kit";
import { Section, inputClass } from "@/integrations/ui/components";
import { download, useAsync } from "@/integrations/ui/hooks";

function csv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((cell) => (/[",\n]/.test(String(cell)) ? `"${String(cell).replace(/"/g, '""')}"` : String(cell))).join(",")).join("\r\n");
}

export function ArReportsPage() {
  const { book, workspaceId } = useArBook();
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [entity, setEntity] = useState("");
  const recon = useAsync(async () => (workspaceId ? (await arService.importPreview(workspaceId)).ageing : undefined), [workspaceId]).data;
  if (!book) return null;
  const ccy = book.settings.groupCurrency;
  const { from, to } = monthRange(period);
  const scope = entity ? { entityId: entity } : {};
  const summary = subledgerSummary(book, from, to, scope);
  const tb = trialBalance(book.journals, { entityId: entity || undefined, to, currency: entity ? "functional" : "group" });
  const tbCcy = tb.currencies.join(", ") || ccy;
  const entities = [...new Set(book.journals.map((journal) => journal.entityId))].sort();
  const open = ageing(book, to, scope);
  const { tenantName } = nameMaps(book);
  const byCurrency = new Map<string, { txn: number; functional: number; group: number; count: number }>();
  for (const row of open) {
    const entry = byCurrency.get(row.invoice.currency) ?? { txn: 0, functional: 0, group: 0, count: 0 };
    entry.txn += row.outstanding;
    entry.functional += row.outstanding * (row.invoice.fx?.rateToFunctional ?? 1);
    entry.group += row.outstandingGroup;
    entry.count += 1;
    byCurrency.set(row.invoice.currency, entry);
  }
  const journals = book.journals.filter((journal) => journal.date >= from && journal.date <= to && (!entity || journal.entityId === entity));

  return (
    <ArPage
      title="AR Reports"
      subtitle="Statement figures, subledger trial balance, currency exposure, journal register, and source ageing reconciliation, all from AR journals."
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Month"><input aria-label="Report month" type="month" className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value || today().slice(0, 7))} /></Field>
          <Field label="Entity"><select aria-label="Report entity" className={inputClass} value={entity} onChange={(event) => setEntity(event.target.value)}><option value="">All entities ({ccy})</option>{entities.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
      }
    >
      <EmptyLedger book={book} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title={`Receivables in the financial statements · ${period}`} subtitle={`${summary.currency}. Revenue for the month; balances at ${to}.`}>
          <table className="data-table text-sm">
            <tbody>
              {summary.revenue.map((row) => <tr key={row.key}><td>{row.label}</td><td className="text-right tabular-nums">{money(row.amount, ccy)}</td></tr>)}
              <tr><td className="text-navy/60">Gross billed</td><td className="text-right tabular-nums">{money(summary.grossBilled, ccy)}</td></tr>
              <tr><td className="text-navy/60">Less credit notes</td><td className="text-right tabular-nums">{money(-summary.creditNotes, ccy)}</td></tr>
              <tr className="font-semibold"><td>Net rental revenue</td><td className="text-right tabular-nums">{money(summary.netRevenue, ccy)}</td></tr>
              <tr><td>Bad debt expense (write-offs)</td><td className="text-right tabular-nums">{money(summary.badDebt, ccy)}</td></tr>
              <tr><td>Foreign exchange gain / (loss) on settlement</td><td className="text-right tabular-nums">{money(summary.fx, ccy)}</td></tr>
              <tr><td>Cash collected from tenants</td><td className="text-right tabular-nums">{money(summary.cashCollected, ccy)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td>Tenant receivables (asset)</td><td className="text-right tabular-nums">{money(summary.receivables, ccy)}</td></tr>
              <tr><td>Unapplied receipts (liability)</td><td className="text-right tabular-nums">{money(summary.unapplied, ccy)}</td></tr>
              <tr><td>Security deposits held (liability)</td><td className="text-right tabular-nums">{money(summary.deposits, ccy)}</td></tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-navy/50">Subledger {summary.balanced ? "balances (debits = credits)" : "does not balance — investigate"}. Imported opening balances post to clearing account {book.settings.accounts.opening.code}, so revenue already recognised in the source system is not counted again.</p>
        </Section>
        <Section title={`Subledger trial balance at ${to}`} subtitle={entity ? `Functional currency of ${entity}: ${tbCcy}` : `Consolidated in ${ccy} at posting-date rates`} actions={<SmallButton onClick={() => download(`ar-trial-balance-${period}.csv`, csv([["Account", "Name", "Debit", "Credit", "Balance"], ...tb.rows.map((row) => [row.account, row.accountName, row.debit, row.credit, row.balance])]), "text/csv")}>Export CSV</SmallButton>}>
          <Table min={520}>
            <thead><tr><th>Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
            <tbody>{tb.rows.map((row) => <tr key={row.account}><td>{row.account} {row.accountName}</td><td className="text-right tabular-nums">{money(row.debit, tb.currencies[0] ?? ccy)}</td><td className="text-right tabular-nums">{money(row.credit, tb.currencies[0] ?? ccy)}</td><td className="text-right tabular-nums">{money(row.balance, tb.currencies[0] ?? ccy)}</td></tr>)}</tbody>
            <tfoot><tr><td>Totals</td><td className="text-right tabular-nums">{money(tb.debit, tb.currencies[0] ?? ccy)}</td><td className="text-right tabular-nums">{money(tb.credit, tb.currencies[0] ?? ccy)}</td><td /></tr></tfoot>
          </Table>
        </Section>
      </div>

      <Section title="Open receivables by currency" subtitle="Original transaction currency, entity functional currency (at invoice rate), and group reporting currency (at closing rate).">
        <Table min={640}>
          <thead><tr><th>Transaction currency</th><th className="text-right">Invoices</th><th className="text-right">Transaction amount</th><th className="text-right">Functional (booked)</th><th className="text-right">Group ({ccy})</th></tr></thead>
          <tbody>{[...byCurrency.entries()].map(([currency, row]) => <tr key={currency}><td>{currency}</td><td className="text-right">{row.count}</td><td className="text-right tabular-nums">{money(row.txn, currency)}</td><td className="text-right tabular-nums">{row.functional.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="text-right tabular-nums">{money(row.group, ccy)}</td></tr>)}</tbody>
        </Table>
      </Section>

      <Section title="Source ageing reconciliation" subtitle={recon?.asOf ? `${recon.source} ageing report as of ${recon.asOf} compared with EstateCFO's AR ageing at the same date, by tenant code.` : "Publish an AR Ageing Report from Yardi, an ERP, or Excel in Data Integrations to reconcile it here."}>
        {!recon || recon.rows.length === 0 ? <p className="text-sm text-navy/60">No source ageing report published.</p> : (
          <Table min={900}>
            <thead><tr><th>Tenant code</th><th>Tenant</th><th className="text-right">Source total</th><th className="text-right">EstateCFO total</th><th className="text-right">Difference</th><th>Where</th></tr></thead>
            <tbody>
              {recon.rows.map((row) => (
                <tr key={row.tenantCode}>
                  <td className="font-semibold">{row.tenantCode}</td>
                  <td>{row.tenantName}</td>
                  <td className="text-right tabular-nums">{money(row.source.total)}</td>
                  <td className="text-right tabular-nums">{money(row.estatecfo.total)}</td>
                  <td className={`text-right tabular-nums ${row.difference ? "!text-red-700" : "!text-emerald-700"}`}>{money(row.difference)}</td>
                  <td className="text-xs">{row.difference === 0 ? "Agrees" : (Object.keys(row.source) as (keyof typeof row.source)[]).filter((key) => key !== "total" && row.source[key] !== row.estatecfo[key]).map((key) => `${key}: ${money(row.source[key])} vs ${money(row.estatecfo[key])}`).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title={`Journal register · ${period}`} subtitle="Immutable. Reversals appear as separate journals." actions={<SmallButton onClick={() => download(`ar-ageing-${to}.csv`, csv([["Invoice", "Tenant", "Entity", "Property", "Due", "Days past due", "Bucket", "Currency", "Outstanding", `Outstanding ${ccy}`], ...open.map((row) => [row.invoice.number, tenantName(row.invoice.tenantId), row.invoice.entityId, row.invoice.propertyId, row.invoice.dueDate, Math.max(row.daysPastDue, 0), row.bucket, row.invoice.currency, row.outstanding, row.outstandingGroup])]), "text/csv")}>Export ageing CSV</SmallButton>}>
        {journals.length === 0 ? <p className="text-sm text-navy/60">No journals in {period}.</p> : (
          <Table min={1000}>
            <thead><tr><th>Journal</th><th>Date</th><th>Entity</th><th>Description</th><th>Lines</th><th className="text-right">Debits</th></tr></thead>
            <tbody>{journals.map((journal) => <tr key={journal.id}><td className="font-semibold">{journal.number}{journal.reversedBy ? <span className="block text-xs font-normal text-navy/50">reversed</span> : null}</td><td>{journal.date}</td><td>{journal.entityId}</td><td>{journal.description}</td><td className="text-xs">{journal.lines.map((line, index) => <span key={index} className="block">{line.debit ? "Dr" : "Cr"} {line.account} {line.accountName} {money(line.debit || line.credit, journal.functionalCurrency)}</span>)}</td><td className="text-right tabular-nums">{money(journal.lines.reduce((sum, line) => sum + line.debit, 0), journal.functionalCurrency)}</td></tr>)}</tbody>
          </Table>
        )}
      </Section>
    </ArPage>
  );
}
