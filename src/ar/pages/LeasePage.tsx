import { useState } from "react";
import { Link } from "react-router-dom";
import { balances } from "@/ar/engine/analytics";
import { contractualMonthly } from "@/ar/engine/billing";
import { chargeLabels, type ArLease, type ChargeSchedule, type ChargeType, type Frequency } from "@/ar/engine/types";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Feedback, Field, SmallButton, Table, Tag, money, nameMaps } from "@/ar/ui/kit";
import { Button, Notice, Section, inputClass } from "@/integrations/ui/components";

type LeaseDraft = Omit<ArLease, "id" | "createdAt" | "updatedAt" | "source"> & { id?: string };

const chargeTypes: ChargeType[] = ["base_rent", "cam", "utilities", "maintenance", "parking", "other"];

export function LeaseReceivablesPage() {
  const { book, workspaceId } = useArBook();
  const [draft, setDraft] = useState<LeaseDraft | null>(null);
  const action = useAction();
  if (!book || !workspaceId) return null;
  const { tenantName } = nameMaps(book);
  const byLease = new Map<string, { billed: number; collected: number; outstanding: number; invoices: number }>();
  for (const balance of balances(book).values()) {
    const id = balance.invoice.leaseId;
    if (!id) continue;
    const row = byLease.get(id) ?? { billed: 0, collected: 0, outstanding: 0, invoices: 0 };
    row.billed += balance.invoice.total - balance.credited;
    row.collected += balance.collected;
    row.outstanding += balance.outstanding;
    row.invoices += 1;
    byLease.set(id, row);
  }
  const set = (patch: Partial<LeaseDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const setCharge = (index: number, patch: Partial<ChargeSchedule>) => setDraft((current) => (current ? { ...current, charges: current.charges.map((charge, at) => (at === index ? { ...charge, ...patch } : charge)) } : current));
  const startNew = () => {
    const tenant = book.tenants[0];
    setDraft({ workspaceId, code: "", tenantId: tenant?.id ?? "", entityId: tenant?.entityId ?? "", propertyId: tenant?.propertyId ?? "", propertyName: tenant?.propertyName ?? "", building: tenant?.building ?? "", unit: tenant?.unit ?? "", start: "", end: "", currency: tenant?.currency ?? book.settings.groupCurrency, charges: [{ id: "base_rent", type: "base_rent", description: "Base rent", amount: 0, frequency: "monthly", escalationPct: 0 }], depositRequired: 0, status: "Active" });
  };

  return (
    <ArPage title="Lease Receivables" subtitle="Lessor leases and their recurring charges. Billing uses these schedules; changes apply to future billing only." actions={<Button primary disabled={!book.tenants.length} onClick={startNew}>+ Add lease</Button>}>
      <Notice tone="sky">Lease accounting (IFRS 16 right-of-use assets and lease liabilities for leases where the group is the lessee) stays in the IFRS 16 application. This module bills and collects rent from tenants; the two exchange lease references only.</Notice>
      <Feedback error={action.error} message={action.message} />
      {draft ? (
        <Section title={draft.id ? `Edit ${draft.code}` : "New lease"}>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await action.run(() => arService.saveLease(draft), `Lease ${draft.code} saved.`)) setDraft(null);
            }}
          >
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Field label="Lease code"><input aria-label="Lease code" className={`${inputClass} w-full`} value={draft.code} onChange={(event) => set({ code: event.target.value })} /></Field>
              <Field label="Tenant">
                <select
                  aria-label="Tenant"
                  className={`${inputClass} w-full`}
                  value={draft.tenantId}
                  onChange={(event) => {
                    const tenant = book.tenants.find((item) => item.id === event.target.value);
                    if (tenant) set({ tenantId: tenant.id, entityId: tenant.entityId, propertyId: tenant.propertyId, propertyName: tenant.propertyName, building: tenant.building, unit: tenant.unit, currency: tenant.currency });
                  }}
                >
                  {book.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.code} · {tenant.name}</option>)}
                </select>
              </Field>
              <Field label="Unit"><input aria-label="Unit" className={`${inputClass} w-full`} value={draft.unit} onChange={(event) => set({ unit: event.target.value })} /></Field>
              <Field label="Start"><input aria-label="Lease start" type="date" className={`${inputClass} w-full`} value={draft.start} onChange={(event) => set({ start: event.target.value })} /></Field>
              <Field label="End"><input aria-label="Lease end" type="date" className={`${inputClass} w-full`} value={draft.end} onChange={(event) => set({ end: event.target.value })} /></Field>
              <Field label="Currency"><input aria-label="Lease currency" maxLength={3} className={`${inputClass} w-full uppercase`} value={draft.currency} onChange={(event) => set({ currency: event.target.value.toUpperCase() })} /></Field>
              <Field label="Deposit required"><input aria-label="Deposit required" type="number" min={0} className={`${inputClass} w-full`} value={draft.depositRequired} onChange={(event) => set({ depositRequired: Number(event.target.value) })} /></Field>
              <Field label="IFRS 16 lease reference" hint="Optional link only"><input aria-label="IFRS 16 reference" className={`${inputClass} w-full`} value={draft.ifrs16LeaseId ?? ""} onChange={(event) => set({ ifrs16LeaseId: event.target.value || undefined })} /></Field>
              <Field label="Status"><select aria-label="Lease status" className={`${inputClass} w-full`} value={draft.status} onChange={(event) => set({ status: event.target.value as ArLease["status"] })}><option>Active</option><option>Ended</option></select></Field>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/50">Charges (amount per billing period)</p>
              <table className="data-table mt-2 text-sm">
                <thead><tr><th>Type</th><th>Description</th><th>Amount</th><th>Frequency</th><th>Escalation %/yr</th><th>From</th><th>To</th><th /></tr></thead>
                <tbody>
                  {draft.charges.map((charge, index) => (
                    <tr key={index}>
                      <td><select aria-label={`Charge ${index + 1} type`} className={inputClass} value={charge.type} onChange={(event) => setCharge(index, { type: event.target.value as ChargeType, id: `${event.target.value}-${index}` })}>{chargeTypes.map((type) => <option key={type} value={type}>{chargeLabels[type]}</option>)}</select></td>
                      <td><input aria-label={`Charge ${index + 1} description`} className={inputClass} value={charge.description} onChange={(event) => setCharge(index, { description: event.target.value })} /></td>
                      <td><input aria-label={`Charge ${index + 1} amount`} type="number" step="0.01" className={`${inputClass} w-28`} value={charge.amount || ""} onChange={(event) => setCharge(index, { amount: Number(event.target.value) })} /></td>
                      <td><select aria-label={`Charge ${index + 1} frequency`} className={inputClass} value={charge.frequency} onChange={(event) => setCharge(index, { frequency: event.target.value as Frequency })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></td>
                      <td><input aria-label={`Charge ${index + 1} escalation`} type="number" step="0.1" min={0} className={`${inputClass} w-20`} value={charge.escalationPct} onChange={(event) => setCharge(index, { escalationPct: Number(event.target.value) })} /></td>
                      <td><input aria-label={`Charge ${index + 1} from`} type="date" className={inputClass} value={charge.start ?? ""} onChange={(event) => setCharge(index, { start: event.target.value || undefined })} /></td>
                      <td><input aria-label={`Charge ${index + 1} to`} type="date" className={inputClass} value={charge.end ?? ""} onChange={(event) => setCharge(index, { end: event.target.value || undefined })} /></td>
                      <td><SmallButton tone="danger" onClick={() => set({ charges: draft.charges.filter((_, at) => at !== index) })}>Remove</SmallButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2"><SmallButton onClick={() => set({ charges: [...draft.charges, { id: `other-${draft.charges.length}`, type: "other", description: "", amount: 0, frequency: "monthly", escalationPct: 0 }] })}>+ Add charge</SmallButton></div>
            </div>
            <div className="flex gap-2"><Button primary type="submit" disabled={action.busy}>Save lease</Button><Button onClick={() => setDraft(null)}>Cancel</Button></div>
          </form>
        </Section>
      ) : null}
      <EmptyLedger book={book} />
      {book.leases.length ? (
        <Section title={`${book.leases.length} lease(s)`}>
          <Table min={1200}>
            <thead><tr><th>Lease</th><th>Tenant</th><th>Entity · property · unit</th><th>Term</th><th>Charges</th><th className="text-right">Monthly equivalent today</th><th className="text-right">Billed to date</th><th className="text-right">Collected</th><th className="text-right">Outstanding</th><th>Deposit</th><th>Status</th><th /></tr></thead>
            <tbody>
              {book.leases.map((lease) => {
                const totals = byLease.get(lease.id);
                const monthly = contractualMonthly(lease, today());
                const held = book.deposits.filter((deposit) => deposit.leaseId === lease.id && deposit.status === "Held").reduce((sum, deposit) => sum + deposit.amount, 0);
                return (
                  <tr key={lease.id}>
                    <td className="font-semibold">{lease.code}<span className="block text-xs font-normal text-navy/50">{lease.source.system}{lease.ifrs16LeaseId ? ` · IFRS 16 ${lease.ifrs16LeaseId}` : ""}</span></td>
                    <td><Link className="underline-offset-2 hover:underline" to={`/estate/ar/tenants/${encodeURIComponent(lease.tenantId)}`}>{tenantName(lease.tenantId)}</Link></td>
                    <td>{lease.entityId} · {lease.propertyName || lease.propertyId} · {lease.unit || "—"}</td>
                    <td className="whitespace-nowrap">{lease.start} → {lease.end}</td>
                    <td className="text-xs">{lease.charges.map((charge) => <span key={charge.id} className="block">{charge.description || chargeLabels[charge.type]} {money(charge.amount, lease.currency)} {charge.frequency}{charge.escalationPct ? ` +${charge.escalationPct}%` : ""}</span>)}</td>
                    <td className="text-right tabular-nums">{money(monthly, lease.currency)}</td>
                    <td className="text-right tabular-nums">{money(totals?.billed ?? 0, lease.currency)}</td>
                    <td className="text-right tabular-nums">{money(totals?.collected ?? 0, lease.currency)}</td>
                    <td className="text-right tabular-nums">{money(totals?.outstanding ?? 0, lease.currency)}</td>
                    <td className="text-xs">{lease.depositRequired ? `${money(held, lease.currency)} of ${money(lease.depositRequired, lease.currency)}` : "—"}{lease.depositRequired && held < lease.depositRequired ? <span className="block text-amber-700">Short {money(lease.depositRequired - held, lease.currency)}</span> : null}</td>
                    <td><Tag>{lease.status}</Tag></td>
                    <td><SmallButton onClick={() => setDraft({ ...lease, charges: lease.charges.map((charge) => ({ ...charge })) })}>Edit</SmallButton></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Section>
      ) : null}
    </ArPage>
  );
}
