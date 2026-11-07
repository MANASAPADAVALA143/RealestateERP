import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { balances } from "@/ar/engine/analytics";
import { daysBetween } from "@/ar/engine/dates";
import { chargeLabels, type ArInvoice, type ChargeType } from "@/ar/engine/types";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Feedback, Field, SmallButton, Table, Tag, money, nameMaps } from "@/ar/ui/kit";
import { Button, Empty, Section, inputClass } from "@/integrations/ui/components";

export function invoiceState(invoice: ArInvoice, outstanding: number | undefined, asOf: string): string {
  if (invoice.status !== "Posted") return invoice.status;
  if ((outstanding ?? 0) <= 0) return "Paid";
  if (daysBetween(invoice.dueDate, asOf) > 0) return "Overdue";
  return outstanding !== invoice.total - invoice.priorCollected ? "Partly paid" : "Open";
}

export function InvoiceRegisterPage() {
  const { book } = useArBook();
  const [filter, setFilter] = useState({ status: "", entity: "", property: "", search: "" });
  if (!book) return null;
  const asOf = today();
  const open = balances(book);
  const { tenantName, propertyName, leases } = nameMaps(book);
  const entities = [...new Set(book.invoices.map((invoice) => invoice.entityId))].sort();
  const properties = [...new Set(book.invoices.map((invoice) => invoice.propertyId))].sort();
  const rows = book.invoices.filter((invoice) => {
    const state = invoiceState(invoice, open.get(invoice.id)?.outstanding, asOf);
    if (filter.status && state !== filter.status) return false;
    if (filter.entity && invoice.entityId !== filter.entity) return false;
    if (filter.property && invoice.propertyId !== filter.property) return false;
    if (filter.search && !`${invoice.number} ${tenantName(invoice.tenantId)} ${invoice.unit}`.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <ArPage title="Invoice Register" subtitle="Every tenant invoice with its billing period, collections, and outstanding balance. Open an invoice for its payment history and accounting entries.">
      <EmptyLedger book={book} />
      <Section
        title={`${rows.length} invoice(s)`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input aria-label="Search invoices" placeholder="Invoice, tenant, unit" className={inputClass} value={filter.search} onChange={(event) => setFilter({ ...filter, search: event.target.value })} />
            <select aria-label="Filter status" className={inputClass} value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}><option value="">All statuses</option>{["Draft", "Approved", "Open", "Partly paid", "Overdue", "Paid", "Reversal requested", "Reversed"].map((status) => <option key={status}>{status}</option>)}</select>
            <select aria-label="Filter entity" className={inputClass} value={filter.entity} onChange={(event) => setFilter({ ...filter, entity: event.target.value })}><option value="">All entities</option>{entities.map((entity) => <option key={entity}>{entity}</option>)}</select>
            <select aria-label="Filter property" className={inputClass} value={filter.property} onChange={(event) => setFilter({ ...filter, property: event.target.value })}><option value="">All properties</option>{properties.map((property) => <option key={property} value={property}>{propertyName(property)}</option>)}</select>
          </div>
        }
      >
        <Table min={1300}>
          <thead><tr><th>Invoice</th><th>Tenant</th><th>Property</th><th>Unit</th><th>Entity</th><th>Lease</th><th>Invoice date</th><th>Due date</th><th>Billing period</th><th className="text-right">Amount</th><th className="text-right">Collected</th><th className="text-right">Outstanding</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((invoice) => {
              const balance = open.get(invoice.id);
              const state = invoiceState(invoice, balance?.outstanding, asOf);
              return (
                <tr key={invoice.id}>
                  <td><Link to={`/estate/ar/invoices/${encodeURIComponent(invoice.id)}`} className="font-semibold underline-offset-2 hover:underline">{invoice.number}</Link>{invoice.kind !== "rent" ? <span className="block text-xs text-navy/50">{invoice.kind === "late_fee" ? "Late charge" : invoice.kind === "imported" ? `Imported · ${invoice.source.system}` : "Manual"}</span> : null}</td>
                  <td>{tenantName(invoice.tenantId)}</td>
                  <td>{propertyName(invoice.propertyId)}</td>
                  <td>{invoice.unit || "—"}</td>
                  <td>{invoice.entityId}</td>
                  <td>{invoice.leaseId ? leases.get(invoice.leaseId)?.code : "—"}</td>
                  <td>{invoice.invoiceDate}</td>
                  <td>{invoice.dueDate}</td>
                  <td>{invoice.billingPeriod}</td>
                  <td className="text-right tabular-nums">{money(invoice.total, invoice.currency)}</td>
                  <td className="text-right tabular-nums">{balance ? money(balance.collected + invoice.priorCollected, invoice.currency) : "—"}</td>
                  <td className="text-right tabular-nums">{balance ? money(balance.outstanding, invoice.currency) : "—"}</td>
                  <td><Tag>{state}</Tag></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>
    </ArPage>
  );
}

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const { book, workspaceId } = useArBook();
  const action = useAction();
  const [credit, setCredit] = useState({ type: "credit" as "credit" | "write_off", amount: "", reason: "", chargeType: "" as ChargeType | "", date: today() });
  const [dispute, setDispute] = useState({ amount: "", reason: "" });
  const [reason, setReason] = useState("");
  if (!book || !workspaceId) return null;
  const invoice = book.invoices.find((item) => item.id === decodeURIComponent(invoiceId));
  if (!invoice) return <ArPage title="Invoice"><Empty>Invoice not found.</Empty></ArPage>;
  const asOf = today();
  const balance = balances(book).get(invoice.id);
  const { tenantName, propertyName, leases } = nameMaps(book);
  const allocations = book.payments.flatMap((payment) => payment.allocations.filter((item) => item.invoiceId === invoice.id).map((item) => ({ payment, item })));
  const notes = book.creditNotes.filter((note) => note.invoiceId === invoice.id);
  const disputes = book.disputes.filter((item) => item.invoiceId === invoice.id);
  const journals = book.journals.filter((journal) => journal.sourceId === invoice.id || journal.lines.some((line) => line.invoiceId === invoice.id));
  const state = invoiceState(invoice, balance?.outstanding, asOf);
  const openDispute = disputes.some((item) => item.status === "Open" || item.status === "Under review");

  return (
    <ArPage title={`Invoice ${invoice.number}`} subtitle={`${tenantName(invoice.tenantId)} · ${propertyName(invoice.propertyId)} unit ${invoice.unit || "—"} · ${invoice.entityId} · lease ${invoice.leaseId ? leases.get(invoice.leaseId)?.code : "—"} · source ${invoice.source.system}`} crumbs={[{ label: "Invoice Register", to: "/estate/ar/invoices" }, { label: invoice.number }]}>
      <Feedback error={action.error} message={action.message} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[["Status", <Tag key="s">{state}</Tag>], ["Invoice date", invoice.invoiceDate], ["Due date", invoice.dueDate], ["Billing period", `${invoice.periodStart} → ${invoice.periodEnd}`], ["Amount", money(invoice.total, invoice.currency)], ["Outstanding", balance ? money(balance.outstanding, invoice.currency) : "—"]].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-navy/10 bg-white p-3 shadow-card"><p className="text-[11px] uppercase tracking-[0.12em] text-navy/45">{label}</p><p className="mt-1 font-semibold text-navy">{value}</p></article>
        ))}
      </section>
      {invoice.fx && invoice.fx.currency !== invoice.fx.groupCurrency ? <p className="text-xs text-navy/60">Booked at 1 {invoice.currency} = {invoice.fx.rateToFunctional.toFixed(4)} {invoice.fx.functionalCurrency} (functional) and {invoice.fx.rateToGroup.toFixed(4)} {invoice.fx.groupCurrency} (group), rate period {invoice.fx.period}.</p> : null}

      <Section title="Lines">
        <Table min={640}>
          <thead><tr><th>Charge</th><th>Description</th><th>Service period</th><th>Note</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{invoice.lines.map((line, index) => <tr key={index}><td>{chargeLabels[line.chargeType]}</td><td>{line.description}</td><td>{line.periodStart} → {line.periodEnd}</td><td className="text-xs text-navy/60">{line.note ?? ""}</td><td className="text-right tabular-nums">{money(line.amount, invoice.currency)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={4}>Total{invoice.priorCollected ? ` · ${money(invoice.priorCollected, invoice.currency)} collected in ${invoice.source.system} before import` : ""}</td><td className="text-right tabular-nums">{money(invoice.total, invoice.currency)}</td></tr></tfoot>
        </Table>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Payment history">
          {allocations.length === 0 && notes.length === 0 ? <p className="text-sm text-navy/60">No receipts or credits applied.</p> : (
            <ul className="space-y-2 text-sm">
              {allocations.map(({ payment, item }) => <li key={item.id} className={payment.status === "Reversed" ? "text-navy/40 line-through" : ""}><b>{item.date}</b> · receipt {payment.number} · {money(item.amount, invoice.currency)} <Tag>{payment.status}</Tag></li>)}
              {notes.map((note) => <li key={note.id}><b>{note.date}</b> · {note.type === "write_off" ? "write-off" : "credit note"} {note.number} · {money(note.amount, invoice.currency)} — {note.reason} <Tag>{note.status}</Tag></li>)}
            </ul>
          )}
        </Section>
        <Section title="Disputes">
          {disputes.map((item) => <p key={item.id} className="text-sm"><Tag>{item.status}</Tag> {money(item.amount, invoice.currency)} — {item.reason} <Link to="/estate/ar/disputes" className="underline">Manage</Link></p>)}
          {invoice.status === "Posted" && balance && balance.outstanding > 0 && !openDispute ? (
            <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); action.run(() => arService.openDispute(workspaceId, { invoiceId: invoice.id, amount: Number(dispute.amount), reason: dispute.reason, owner: book.user }), "Dispute opened.").then((ok) => ok && setDispute({ amount: "", reason: "" })); }}>
              <input aria-label="Disputed amount" type="number" step="0.01" placeholder="Disputed amount" className={`${inputClass} w-36`} value={dispute.amount} onChange={(event) => setDispute({ ...dispute, amount: event.target.value })} />
              <input aria-label="Dispute reason" placeholder="What does the tenant dispute?" className={`${inputClass} flex-1`} value={dispute.reason} onChange={(event) => setDispute({ ...dispute, reason: event.target.value })} />
              <Button type="submit">Open dispute</Button>
            </form>
          ) : disputes.length === 0 ? <p className="text-sm text-navy/60">No disputes.</p> : null}
        </Section>
      </div>

      {invoice.status === "Posted" && balance && balance.outstanding > 0 ? (
        <Section title="Credit note or write-off" subtitle={`Requires approval${book.settings.approvals.creditNotes ? "" : " (switched off in settings — posts immediately)"}. Up to ${money(balance.outstanding, invoice.currency)}.`}>
          <form className="grid gap-3 md:grid-cols-6" onSubmit={(event) => { event.preventDefault(); action.run(() => arService.createCreditNote(workspaceId, { invoiceId: invoice.id, amount: Number(credit.amount), reason: credit.reason, type: credit.type, chargeType: credit.chargeType || undefined, date: credit.date }), credit.type === "write_off" ? "Write-off requested." : "Credit note requested.").then((ok) => ok && setCredit({ ...credit, amount: "", reason: "" })); }}>
            <Field label="Type"><select aria-label="Credit type" className={`${inputClass} w-full`} value={credit.type} onChange={(event) => setCredit({ ...credit, type: event.target.value as "credit" | "write_off" })}><option value="credit">Credit note (reduces revenue)</option><option value="write_off">Write-off (bad debt expense)</option></select></Field>
            {credit.type === "credit" ? <Field label="Charge"><select aria-label="Credit charge" className={`${inputClass} w-full`} value={credit.chargeType} onChange={(event) => setCredit({ ...credit, chargeType: event.target.value as ChargeType })}><option value="">{chargeLabels[invoice.lines[0]?.chargeType ?? "other"]}</option>{[...new Set(invoice.lines.map((line) => line.chargeType))].map((type) => <option key={type} value={type}>{chargeLabels[type]}</option>)}</select></Field> : null}
            <Field label="Amount"><input aria-label="Credit amount" type="number" step="0.01" className={`${inputClass} w-full`} value={credit.amount} onChange={(event) => setCredit({ ...credit, amount: event.target.value })} /></Field>
            <Field label="Date"><input aria-label="Credit date" type="date" className={`${inputClass} w-full`} value={credit.date} onChange={(event) => setCredit({ ...credit, date: event.target.value })} /></Field>
            <Field label="Reason"><input aria-label="Credit reason" className={`${inputClass} w-full`} value={credit.reason} onChange={(event) => setCredit({ ...credit, reason: event.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit" disabled={!credit.amount}>Request</Button></div>
          </form>
          {notes.filter((note) => note.status === "Draft").map((note) => (
            <div key={note.id} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              <span><b>{note.number}</b> {note.type === "write_off" ? "write-off" : "credit"} {money(note.amount, invoice.currency)} awaiting approval — {note.reason} (requested by {note.requestedBy})</span>
              <SmallButton tone="primary" onClick={() => action.run(() => arService.approveCreditNote(note.id), `${note.number} posted.`)}>Approve and post</SmallButton>
              <SmallButton tone="danger" onClick={() => action.run(() => arService.rejectCreditNote(note.id, "Rejected on review"), `${note.number} rejected.`)}>Reject</SmallButton>
            </div>
          ))}
        </Section>
      ) : null}

      <Section title="Accounting entries" subtitle="Posted journals are never edited. Corrections use credit notes or controlled reversals.">
        {journals.length === 0 ? <p className="text-sm text-navy/60">Not posted yet.</p> : journals.map((journal) => (
          <div key={journal.id} className="mb-4">
            <p className="text-sm font-semibold text-navy">{journal.number} · {journal.date} · {journal.description} {journal.reversedBy ? <Tag tone="Reversed">Reversed</Tag> : null}</p>
            <table className="data-table mt-1 max-w-2xl text-xs">
              <thead><tr><th>Account</th><th className="text-right">Debit ({journal.functionalCurrency})</th><th className="text-right">Credit ({journal.functionalCurrency})</th></tr></thead>
              <tbody>{journal.lines.map((line, index) => <tr key={index}><td>{line.account} {line.accountName}</td><td className="text-right tabular-nums">{line.debit ? money(line.debit, journal.functionalCurrency) : ""}</td><td className="text-right tabular-nums">{line.credit ? money(line.credit, journal.functionalCurrency) : ""}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
      </Section>

      {invoice.status === "Posted" || invoice.status === "Reversal requested" ? (
        <Section title="Reversal" subtitle="For invoices issued in error with no receipts or credits applied. Requires approval.">
          {invoice.status === "Posted" ? (
            <div className="flex flex-wrap gap-2"><input aria-label="Reversal reason" placeholder="Reason" className={`${inputClass} flex-1`} value={reason} onChange={(event) => setReason(event.target.value)} /><Button danger onClick={() => action.run(() => arService.requestInvoiceReversal(invoice.id, reason), "Reversal requested.")}>Request reversal</Button></div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm"><span>Requested by {invoice.reversal?.requestedBy}: {invoice.reversal?.reason}</span><SmallButton tone="danger" onClick={() => action.run(() => arService.approveInvoiceReversal(invoice.id, today()), "Invoice reversed.")}>Approve reversal (dated today)</SmallButton><SmallButton onClick={() => action.run(() => arService.cancelInvoiceReversal(invoice.id), "Reversal rejected.")}>Reject</SmallButton></div>
          )}
        </Section>
      ) : null}
    </ArPage>
  );
}
