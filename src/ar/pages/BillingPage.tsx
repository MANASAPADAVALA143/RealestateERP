import { useState } from "react";
import { Link } from "react-router-dom";
import type { ProposedInvoice, SkippedCharge } from "@/ar/engine/billing";
import { chargeLabels, type ChargeType } from "@/ar/engine/types";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Feedback, Field, SmallButton, Table, Tag, money, nameMaps } from "@/ar/ui/kit";
import { Button, Section, inputClass } from "@/integrations/ui/components";

export function RentalBillingPage() {
  const { book, workspaceId } = useArBook();
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [preview, setPreview] = useState<{ proposals: ProposedInvoice[]; skipped: SkippedCharge[] } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lateAsOf, setLateAsOf] = useState(today());
  const [late, setLate] = useState<{ proposals: ProposedInvoice[]; skipped: SkippedCharge[] } | null>(null);
  const [manual, setManual] = useState({ tenantId: "", invoiceDate: today(), dueDate: today(), type: "other" as ChargeType, description: "", amount: "" });
  const action = useAction();
  if (!book || !workspaceId) return null;
  const { tenantName, leases } = nameMaps(book);
  const pending = book.invoices.filter((invoice) => invoice.status === "Draft" || invoice.status === "Approved");
  const requireApproval = book.settings.approvals.invoices;

  async function runPreview() {
    await action.run(async () => {
      const result = await arService.billingPreview(workspaceId!, period);
      setPreview(result);
      setSelected(Object.fromEntries(result.proposals.map((proposal) => [proposal.leaseId ?? proposal.tenantId, true])));
    });
  }

  return (
    <ArPage title="Rental Billing" subtitle="Recurring billing for base rent, CAM, utilities, maintenance, parking, and other lease charges, with escalation and proration. Drafts are approved, then posted to the ledger.">
      <Feedback error={action.error} message={action.message} />
      <EmptyLedger book={book} />
      <Section title="Billing run" subtitle="Charges already billed for the same lease, charge, and period are skipped automatically.">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Billing month"><input aria-label="Billing month" type="month" className={inputClass} value={period} onChange={(event) => { setPeriod(event.target.value); setPreview(null); }} /></Field>
          <Button onClick={runPreview} disabled={action.busy || !period}>Preview billing</Button>
          {preview?.proposals.length ? (
            <Button
              primary
              disabled={action.busy || !Object.values(selected).some(Boolean)}
              onClick={async () => {
                const leaseIds = preview.proposals.filter((proposal) => selected[proposal.leaseId ?? proposal.tenantId]).map((proposal) => proposal.leaseId!).filter(Boolean);
                if (await action.run(() => arService.createDrafts(workspaceId, period, { leaseIds }), `Draft invoices created for ${period}. Review and ${requireApproval ? "approve" : "post"} them below.`)) setPreview(await arService.billingPreview(workspaceId, period));
              }}
            >
              Create {Object.values(selected).filter(Boolean).length} draft invoice(s)
            </Button>
          ) : null}
        </div>
        {preview ? (
          <div className="mt-4 space-y-3">
            {preview.proposals.length === 0 ? <p className="text-sm text-navy/60">Nothing to bill for {period}.</p> : (
              <Table min={980}>
                <thead><tr><th /><th>Tenant</th><th>Lease · unit</th><th>Invoice date</th><th>Due</th><th>Lines</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {preview.proposals.map((proposal) => {
                    const key = proposal.leaseId ?? proposal.tenantId;
                    return (
                      <tr key={key}>
                        <td><input type="checkbox" aria-label={`Bill ${proposal.tenantName}`} checked={Boolean(selected[key])} onChange={(event) => setSelected({ ...selected, [key]: event.target.checked })} /></td>
                        <td className="font-semibold">{proposal.tenantName}</td>
                        <td>{proposal.leaseId ? leases.get(proposal.leaseId)?.code : "—"} · {proposal.unit}</td>
                        <td>{proposal.invoiceDate}</td>
                        <td>{proposal.dueDate}</td>
                        <td className="text-xs">{proposal.lines.map((line, index) => <span key={index} className="block">{line.description}: {money(line.amount, proposal.currency)} <span className="text-navy/50">{line.periodStart} → {line.periodEnd}{line.note ? ` · ${line.note}` : ""}</span></span>)}</td>
                        <td className="text-right font-semibold tabular-nums">{money(proposal.total, proposal.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            {preview.skipped.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-navy">
                <p className="font-semibold">{preview.skipped.length} charge(s) not billed</p>
                <ul className="mt-1 list-disc pl-5">{preview.skipped.map((item, index) => <li key={index}>{item.tenant}{item.charge ? ` · ${item.charge}` : ""}: {item.reason}</li>)}</ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section
        title={`Awaiting ${requireApproval ? "approval and posting" : "posting"} (${pending.length})`}
        subtitle={requireApproval ? "Approval is required before posting (AR Settings). Drafts can be deleted; posted invoices can only be credited or reversed." : "Approval is switched off in AR Settings."}
        actions={
          pending.length ? (
            <div className="flex gap-2">
              {requireApproval ? <Button disabled={action.busy || !pending.some((invoice) => invoice.status === "Draft")} onClick={() => action.run(async () => { for (const invoice of pending.filter((item) => item.status === "Draft")) await arService.approveInvoice(invoice.id); }, "All drafts approved.")}>Approve all drafts</Button> : null}
              <Button primary disabled={action.busy || !pending.some((invoice) => invoice.status === "Approved" || !requireApproval)} onClick={() => action.run(async () => { for (const invoice of pending.filter((item) => item.status === "Approved" || !requireApproval)) await arService.postInvoice(invoice.id); }, "Invoices posted to the ledger.")}>Post all {requireApproval ? "approved" : ""}</Button>
            </div>
          ) : null
        }
      >
        {pending.length === 0 ? <p className="text-sm text-navy/60">No draft invoices.</p> : (
          <Table min={900}>
            <thead><tr><th>Invoice</th><th>Tenant</th><th>Type</th><th>Billing period</th><th>Invoice date</th><th className="text-right">Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {pending.map((invoice) => (
                <tr key={invoice.id}>
                  <td><Link to={`/estate/ar/invoices/${encodeURIComponent(invoice.id)}`} className="font-semibold underline-offset-2 hover:underline">{invoice.number}</Link></td>
                  <td>{tenantName(invoice.tenantId)}</td>
                  <td>{invoice.kind === "late_fee" ? "Late charge" : invoice.kind === "manual" ? "Manual" : invoice.kind === "imported" ? "Imported" : "Rent"}</td>
                  <td>{invoice.billingPeriod}</td>
                  <td>{invoice.invoiceDate}</td>
                  <td className="text-right tabular-nums">{money(invoice.total, invoice.currency)}</td>
                  <td><Tag>{invoice.status}</Tag></td>
                  <td className="space-x-1 whitespace-nowrap">
                    {invoice.status === "Draft" && requireApproval ? <SmallButton onClick={() => action.run(() => arService.approveInvoice(invoice.id), `${invoice.number} approved.`)}>Approve</SmallButton> : null}
                    {invoice.status === "Approved" || !requireApproval ? <SmallButton tone="primary" onClick={() => action.run(() => arService.postInvoice(invoice.id), `${invoice.number} posted.`)}>Post</SmallButton> : null}
                    <SmallButton tone="danger" onClick={() => window.confirm(`Delete draft ${invoice.number}?`) && action.run(() => arService.deleteDraft(invoice.id), `${invoice.number} deleted.`)}>Delete</SmallButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Late payment charges" subtitle={book.settings.lateFee.enabled ? `${book.settings.lateFee.percent}% of the overdue balance (minimum ${book.settings.lateFee.minimum}, plus ${book.settings.lateFee.flat} flat) after ${book.settings.lateFee.graceDays} days' grace. Disputed invoices are excluded.` : "Switched off in AR Settings."}>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Assess as of"><input aria-label="Late charge date" type="date" className={inputClass} value={lateAsOf} onChange={(event) => setLateAsOf(event.target.value)} /></Field>
            <Button onClick={() => action.run(async () => setLate(await arService.lateFeePreview(workspaceId, lateAsOf)))}>Preview late charges</Button>
            {late?.proposals.length ? <Button primary onClick={async () => { if (await action.run(() => arService.createLateFeeDrafts(workspaceId, lateAsOf), "Late payment charges drafted for approval.")) setLate(await arService.lateFeePreview(workspaceId, lateAsOf)); }}>Draft {late.proposals.length} charge(s)</Button> : null}
          </div>
          {late ? (
            <ul className="mt-3 space-y-1 text-sm">
              {late.proposals.map((proposal) => <li key={proposal.billingKeys[0]}><b>{proposal.tenantName}</b>: {money(proposal.total, proposal.currency)} <span className="text-xs text-navy/50">{proposal.lines[0].note}</span></li>)}
              {late.skipped.map((item, index) => <li key={`s${index}`} className="text-xs text-navy/60">{item.tenant}: {item.reason}</li>)}
              {late.proposals.length === 0 && late.skipped.length === 0 ? <li className="text-navy/60">No overdue invoices past the grace period.</li> : null}
            </ul>
          ) : null}
        </Section>
        <Section title="Manual invoice" subtitle="One-off lease-related charges. Created as a draft for approval.">
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await action.run(() => arService.createManualInvoice(workspaceId, { tenantId: manual.tenantId || book.tenants[0]?.id, invoiceDate: manual.invoiceDate, dueDate: manual.dueDate, lines: [{ chargeType: manual.type, description: manual.description || chargeLabels[manual.type], amount: Number(manual.amount) }] }), "Manual invoice drafted.")) setManual({ ...manual, description: "", amount: "" });
            }}
          >
            <Field label="Tenant"><select aria-label="Manual invoice tenant" className={`${inputClass} w-full`} value={manual.tenantId} onChange={(event) => setManual({ ...manual, tenantId: event.target.value })}>{book.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></Field>
            <Field label="Invoice date"><input aria-label="Manual invoice date" type="date" className={`${inputClass} w-full`} value={manual.invoiceDate} onChange={(event) => setManual({ ...manual, invoiceDate: event.target.value })} /></Field>
            <Field label="Due date"><input aria-label="Manual due date" type="date" className={`${inputClass} w-full`} value={manual.dueDate} onChange={(event) => setManual({ ...manual, dueDate: event.target.value })} /></Field>
            <Field label="Charge type"><select aria-label="Manual charge type" className={`${inputClass} w-full`} value={manual.type} onChange={(event) => setManual({ ...manual, type: event.target.value as ChargeType })}>{(["base_rent", "cam", "utilities", "maintenance", "parking", "other"] as ChargeType[]).map((type) => <option key={type} value={type}>{chargeLabels[type]}</option>)}</select></Field>
            <Field label="Description"><input aria-label="Manual description" className={`${inputClass} w-full`} value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} /></Field>
            <Field label="Amount"><input aria-label="Manual amount" type="number" step="0.01" className={`${inputClass} w-full`} value={manual.amount} onChange={(event) => setManual({ ...manual, amount: event.target.value })} /></Field>
            <div><Button type="submit" disabled={!book.tenants.length || !manual.amount}>Draft invoice</Button></div>
          </form>
        </Section>
      </div>
    </ArPage>
  );
}
