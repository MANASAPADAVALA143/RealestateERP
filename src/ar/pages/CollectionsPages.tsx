import { useState } from "react";
import { Link } from "react-router-dom";
import { tenantBalances } from "@/ar/engine/analytics";
import { collectionsIntelligence } from "@/ar/engine/intelligence";
import type { ArDispute, FollowUpType } from "@/ar/engine/types";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Feedback, Field, SmallButton, Table, Tag, money, moneyShort, nameMaps } from "@/ar/ui/kit";
import { Button, Notice, Section, inputClass } from "@/integrations/ui/components";

export function CollectionsPage() {
  const { book, workspaceId } = useArBook();
  const action = useAction();
  const [form, setForm] = useState({ tenantId: "", type: "Call" as FollowUpType, note: "", promiseDate: "", promiseAmount: "", nextFollowUp: "" });
  if (!book || !workspaceId) return null;
  const asOf = today();
  const ccy = book.settings.groupCurrency;
  const intel = collectionsIntelligence(book, asOf);
  const owed = tenantBalances(book, asOf);
  const { tenantName } = nameMaps(book);
  const drafts = book.followUps.filter((item) => item.reminderStatus === "Draft");

  function draftReminder(tenantId: string) {
    const balance = owed.get(tenantId);
    const tenant = book!.tenants.find((item) => item.id === tenantId);
    setForm({ tenantId, type: "Reminder", note: `Dear ${tenant?.contactName || tenant?.name}, our records show ${money(balance?.overdue ?? 0, balance?.currency)} overdue on your account at ${tenant?.propertyName || ""} unit ${tenant?.unit || ""}. Please remit or contact us to agree a payment date.`, promiseDate: "", promiseAmount: "", nextFollowUp: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ArPage title="Collections Management" subtitle="Prioritised worklist from the AR ledger, follow-up logging, promise-to-pay tracking, and payment reminders that need approval before they go out.">
      <Notice tone="sky">The collections assistant is deterministic: it ranks tenants from posted invoices, receipts, disputes, and follow-ups, and states its basis. It never sends reminders. Approved reminders are recorded for sending from your own mail system, since no email service is configured.</Notice>
      <Feedback error={action.error} message={action.message} />
      <EmptyLedger book={book} />

      <Section title="Log a follow-up or draft a reminder">
        <form
          className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await action.run(() => arService.addFollowUp(workspaceId, { tenantId: form.tenantId, date: asOf, type: form.type, note: form.note, promiseDate: form.promiseDate || undefined, promiseAmount: form.promiseAmount ? Number(form.promiseAmount) : undefined, nextFollowUp: form.nextFollowUp || undefined }), form.type === "Reminder" ? "Reminder drafted for approval." : "Follow-up logged.")) setForm({ ...form, note: "", promiseDate: "", promiseAmount: "", nextFollowUp: "" });
          }}
        >
          <Field label="Tenant"><select aria-label="Follow-up tenant" className={`${inputClass} w-full`} value={form.tenantId} onChange={(event) => setForm({ ...form, tenantId: event.target.value })}><option value="">Choose tenant</option>{book.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></Field>
          <Field label="Type"><select aria-label="Follow-up type" className={`${inputClass} w-full`} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FollowUpType })}>{(["Call", "Email", "Letter", "Meeting", "Note", "Reminder"] as FollowUpType[]).map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Promise to pay by"><input aria-label="Promise date" type="date" className={`${inputClass} w-full`} value={form.promiseDate} onChange={(event) => setForm({ ...form, promiseDate: event.target.value })} /></Field>
          <Field label="Promised amount"><input aria-label="Promised amount" type="number" step="0.01" className={`${inputClass} w-full`} value={form.promiseAmount} onChange={(event) => setForm({ ...form, promiseAmount: event.target.value })} /></Field>
          <Field label="Next follow-up"><input aria-label="Next follow-up" type="date" className={`${inputClass} w-full`} value={form.nextFollowUp} onChange={(event) => setForm({ ...form, nextFollowUp: event.target.value })} /></Field>
          <div className="flex items-end"><Button primary type="submit" disabled={!form.tenantId || !form.note.trim()}>{form.type === "Reminder" ? "Draft reminder" : "Log follow-up"}</Button></div>
          <div className="md:col-span-3 xl:col-span-6"><Field label="Note"><textarea aria-label="Follow-up note" className={`${inputClass} min-h-16 w-full`} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field></div>
        </form>
      </Section>

      {drafts.length ? (
        <Section title={`Reminders awaiting approval (${drafts.length})`}>
          <ul className="space-y-2 text-sm">{drafts.map((item) => <li key={item.id} className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"><span className="flex-1"><b>{tenantName(item.tenantId)}</b> · drafted {item.date} by {item.by}<span className="block text-navy/70">{item.note}</span></span><SmallButton tone="primary" onClick={() => action.run(() => arService.approveReminder(item.id), "Reminder approved. It has not been sent; send it from your mail system.")}>Approve</SmallButton></li>)}</ul>
        </Section>
      ) : null}

      <Section title="Prioritised worklist" subtitle={intel.basis}>
        {intel.priorities.length === 0 ? <p className="text-sm text-navy/60">No overdue tenants.</p> : (
          <Table min={1000}>
            <thead><tr><th>#</th><th>Tenant</th><th>Property</th><th className="text-right">Overdue ({ccy})</th><th className="text-right">Oldest (days)</th><th>Why</th><th>Suggested action</th><th /></tr></thead>
            <tbody>
              {intel.priorities.map((row, index) => (
                <tr key={row.tenantId}>
                  <td>{index + 1}</td>
                  <td><Link to={`/estate/ar/tenants/${encodeURIComponent(row.tenantId)}`} className="font-semibold underline-offset-2 hover:underline">{row.tenantName}</Link></td>
                  <td>{row.propertyName}</td>
                  <td className="text-right tabular-nums">{moneyShort(row.overdue, ccy)}</td>
                  <td className="text-right">{row.oldestDays}</td>
                  <td className="text-xs">{row.reasons.join(" · ")}</td>
                  <td className="text-xs">{row.suggestedAction}</td>
                  <td className="space-x-1 whitespace-nowrap"><SmallButton onClick={() => setForm({ ...form, tenantId: row.tenantId, type: "Call" })}>Log call</SmallButton><SmallButton onClick={() => draftReminder(row.tenantId)}>Draft reminder</SmallButton></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Collection insights">
          {intel.insights.length === 0 ? <p className="text-sm text-navy/60">No risks detected.</p> : <ul className="space-y-2 text-sm">{intel.insights.map((item) => <li key={item.id} className="flex items-start gap-2"><Tag tone={item.severity}>{item.severity}</Tag><span><b>{item.title}.</b> <span className="text-navy/70">{item.detail}</span></span></li>)}</ul>}
        </Section>
        <Section title="Expected collections" subtitle={intel.expected.basis}>
          <table className="data-table text-sm">
            <tbody>
              {intel.expected.buckets.map((bucket) => <tr key={bucket.label}><td>{bucket.label}</td><td className="text-right">{bucket.count} invoice(s)</td><td className="text-right tabular-nums">{moneyShort(bucket.amount, ccy)}</td></tr>)}
              <tr><td className="!text-red-700">At risk (not forecast)</td><td /><td className="text-right tabular-nums !text-red-700">{moneyShort(intel.expected.atRisk, ccy)}</td></tr>
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Follow-up history">
        {book.followUps.length === 0 ? <p className="text-sm text-navy/60">No follow-ups yet.</p> : (
          <Table min={900}>
            <thead><tr><th>Date</th><th>Tenant</th><th>Type</th><th>Note</th><th>Promise</th><th>Next</th><th>By</th></tr></thead>
            <tbody>{book.followUps.map((item) => <tr key={item.id}><td>{item.date}</td><td>{tenantName(item.tenantId)}</td><td>{item.type}{item.reminderStatus ? <span className="block text-xs text-navy/50">{item.reminderStatus === "Draft" ? "Awaiting approval" : `Approved by ${item.approvedBy}; not sent automatically`}</span> : null}</td><td className="text-xs">{item.note}</td><td>{item.promiseDate ? `${item.promiseDate}${item.promiseAmount ? ` · ${money(item.promiseAmount)}` : ""}` : "—"}</td><td>{item.nextFollowUp ?? "—"}</td><td>{item.by}</td></tr>)}</tbody>
          </Table>
        )}
      </Section>
    </ArPage>
  );
}

export function DisputesPage() {
  const { book } = useArBook();
  const action = useAction();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolution, setResolution] = useState<Record<string, { text: string; amount: string }>>({});
  if (!book) return null;
  const { tenantName } = nameMaps(book);
  const invoices = new Map(book.invoices.map((invoice) => [invoice.id, invoice]));
  const open = (dispute: ArDispute) => dispute.status === "Open" || dispute.status === "Under review";

  return (
    <ArPage title="Dispute Management" subtitle="Disputed invoices stay in receivables until resolved. Resolving with a credit creates a credit note that still needs approval; late charges are not raised on disputed invoices.">
      <Feedback error={action.error} message={action.message} />
      <EmptyLedger book={book} />
      {book.disputes.length === 0 ? <Section title="Disputes"><p className="text-sm text-navy/60">No disputes. Open one from an invoice in the <Link to="/estate/ar/invoices" className="underline">Invoice Register</Link>.</p></Section> : book.disputes.map((dispute) => {
        const invoice = invoices.get(dispute.invoiceId);
        const draft = resolution[dispute.id] ?? { text: "", amount: String(dispute.amount) };
        const credit = dispute.creditNoteId ? book.creditNotes.find((note) => note.id === dispute.creditNoteId) : undefined;
        return (
          <Section key={dispute.id} title={`${invoice?.number ?? "Invoice"} · ${tenantName(dispute.tenantId)}`} subtitle={`${money(dispute.amount, invoice?.currency)} disputed · opened ${dispute.openedAt.slice(0, 10)} by ${dispute.openedBy} · owner ${dispute.owner}`} actions={<Tag>{dispute.status}</Tag>}>
            <p className="text-sm text-navy">{dispute.reason}</p>
            {dispute.notes.length ? <ul className="mt-2 space-y-1 text-xs text-navy/70">{dispute.notes.map((note, index) => <li key={index}>{note.at.slice(0, 10)} · {note.by}: {note.text}</li>)}</ul> : null}
            {dispute.resolution ? <p className="mt-2 text-sm"><b>Resolution:</b> {dispute.resolution}{credit ? ` · credit note ${credit.number} (${credit.status})` : ""}</p> : null}
            {open(dispute) ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input aria-label="Dispute note" placeholder="Add a note" className={`${inputClass} flex-1`} value={notes[dispute.id] ?? ""} onChange={(event) => setNotes({ ...notes, [dispute.id]: event.target.value })} />
                  <SmallButton onClick={() => action.run(() => arService.updateDispute(dispute.id, { note: notes[dispute.id], status: "Under review" }), "Dispute updated.").then((ok) => ok && setNotes({ ...notes, [dispute.id]: "" }))}>Add note · mark under review</SmallButton>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input aria-label="Resolution" placeholder="Resolution" className={`${inputClass} flex-1`} value={draft.text} onChange={(event) => setResolution({ ...resolution, [dispute.id]: { ...draft, text: event.target.value } })} />
                  <input aria-label="Credit amount" type="number" step="0.01" className={`${inputClass} w-28`} value={draft.amount} onChange={(event) => setResolution({ ...resolution, [dispute.id]: { ...draft, amount: event.target.value } })} />
                  <SmallButton tone="primary" onClick={() => action.run(() => arService.resolveDispute(dispute.id, { kind: "credit", resolution: draft.text, amount: Number(draft.amount), date: today() }), "Resolved; credit note created for approval on the invoice.")}>Resolve with credit</SmallButton>
                  <SmallButton tone="danger" onClick={() => action.run(() => arService.resolveDispute(dispute.id, { kind: "reject", resolution: draft.text }), "Dispute rejected; balance remains due.")}>Reject dispute</SmallButton>
                </div>
              </div>
            ) : null}
          </Section>
        );
      })}
    </ArPage>
  );
}
