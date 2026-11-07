import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { balances, statementOfAccount, tenantBalances } from "@/ar/engine/analytics";
import { paymentHistory } from "@/ar/engine/intelligence";
import type { ArTenant, Frequency } from "@/ar/engine/types";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Feedback, Field, SmallButton, Table, Tag, money, nameMaps } from "@/ar/ui/kit";
import { Button, Empty, Section, inputClass } from "@/integrations/ui/components";
import { integrationService, useAsync } from "@/integrations/ui/hooks";

type TenantDraft = Omit<ArTenant, "id" | "createdAt" | "updatedAt" | "source"> & { id?: string };

function blank(workspaceId: string, user: string, currency: string, terms: number): TenantDraft {
  return { workspaceId, code: "", name: "", entityId: "", propertyId: "", propertyName: "", building: "", unit: "", contactName: "", email: "", phone: "", billingFrequency: "monthly", paymentTermsDays: terms, currency, collectionOwner: user, status: "Active" };
}

function useMasterOptions(workspaceId: string | undefined) {
  return useAsync(async () => (workspaceId ? integrationService.master(workspaceId) : undefined), [workspaceId]).data;
}

export function TenantRegisterPage() {
  const { book, workspaceId } = useArBook();
  const master = useMasterOptions(workspaceId);
  const [draft, setDraft] = useState<TenantDraft | null>(null);
  const [search, setSearch] = useState("");
  const action = useAction();
  if (!book || !workspaceId) return null;
  const asOf = today();
  const owed = tenantBalances(book, asOf);
  const leases = new Map<string, string[]>();
  for (const lease of book.leases) leases.set(lease.tenantId, [...(leases.get(lease.tenantId) ?? []), lease.code]);
  const deposits = new Map<string, number>();
  for (const deposit of book.deposits) if (deposit.status === "Held") deposits.set(deposit.tenantId, (deposits.get(deposit.tenantId) ?? 0) + deposit.amount);
  const shown = book.tenants.filter((tenant) => !search || `${tenant.code} ${tenant.name} ${tenant.propertyName} ${tenant.unit}`.toLowerCase().includes(search.toLowerCase()));
  const set = (patch: Partial<TenantDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  return (
    <ArPage title="Tenant Register" subtitle="Each tenant is linked to a legal entity, property, building, unit, lease, billing terms, and security deposit." actions={<Button primary onClick={() => setDraft(blank(workspaceId, book.user, book.settings.groupCurrency, book.settings.defaultTermsDays))}>+ Add tenant</Button>}>
      <Feedback error={action.error} message={action.message} />
      {draft ? (
        <Section title={draft.id ? `Edit ${draft.name}` : "New tenant"}>
          <form
            className="grid gap-4 md:grid-cols-3 xl:grid-cols-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await action.run(() => arService.saveTenant(draft), `Tenant ${draft.code} saved.`)) setDraft(null);
            }}
          >
            <Field label="Tenant code"><input aria-label="Tenant code" className={`${inputClass} w-full`} value={draft.code} onChange={(event) => set({ code: event.target.value })} /></Field>
            <Field label="Tenant name"><input aria-label="Tenant name" className={`${inputClass} w-full`} value={draft.name} onChange={(event) => set({ name: event.target.value })} /></Field>
            <Field label="Legal entity">
              <input aria-label="Legal entity" list="ar-entities" className={`${inputClass} w-full`} value={draft.entityId} onChange={(event) => set({ entityId: event.target.value })} />
              <datalist id="ar-entities">{master?.data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</datalist>
            </Field>
            <Field label="Property">
              <input
                aria-label="Property"
                list="ar-properties"
                className={`${inputClass} w-full`}
                value={draft.propertyId}
                onChange={(event) => {
                  const match = master?.data.properties.find((property) => property.id === event.target.value);
                  const entity = master?.propertyValues[event.target.value]?.entity_id;
                  set({ propertyId: event.target.value, propertyName: match?.name ?? draft.propertyName, entityId: draft.entityId || (typeof entity === "string" ? entity : "") });
                }}
              />
              <datalist id="ar-properties">{master?.data.properties.slice(0, 200).map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</datalist>
            </Field>
            <Field label="Property name"><input aria-label="Property name" className={`${inputClass} w-full`} value={draft.propertyName} onChange={(event) => set({ propertyName: event.target.value })} /></Field>
            <Field label="Building"><input aria-label="Building" className={`${inputClass} w-full`} value={draft.building} onChange={(event) => set({ building: event.target.value })} /></Field>
            <Field label="Unit"><input aria-label="Unit" className={`${inputClass} w-full`} value={draft.unit} onChange={(event) => set({ unit: event.target.value })} /></Field>
            <Field label="Contact name"><input aria-label="Contact name" className={`${inputClass} w-full`} value={draft.contactName} onChange={(event) => set({ contactName: event.target.value })} /></Field>
            <Field label="Email"><input aria-label="Email" className={`${inputClass} w-full`} value={draft.email} onChange={(event) => set({ email: event.target.value })} /></Field>
            <Field label="Phone"><input aria-label="Phone" className={`${inputClass} w-full`} value={draft.phone} onChange={(event) => set({ phone: event.target.value })} /></Field>
            <Field label="Billing frequency">
              <select aria-label="Billing frequency" className={`${inputClass} w-full`} value={draft.billingFrequency} onChange={(event) => set({ billingFrequency: event.target.value as Frequency })}>
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
              </select>
            </Field>
            <Field label="Payment terms (days)"><input aria-label="Payment terms" type="number" min={0} className={`${inputClass} w-full`} value={draft.paymentTermsDays} onChange={(event) => set({ paymentTermsDays: Number(event.target.value) })} /></Field>
            <Field label="Billing currency"><input aria-label="Billing currency" maxLength={3} className={`${inputClass} w-full uppercase`} value={draft.currency} onChange={(event) => set({ currency: event.target.value.toUpperCase() })} /></Field>
            <Field label="Collection owner"><input aria-label="Collection owner" className={`${inputClass} w-full`} value={draft.collectionOwner} onChange={(event) => set({ collectionOwner: event.target.value })} /></Field>
            <Field label="Status">
              <select aria-label="Status" className={`${inputClass} w-full`} value={draft.status} onChange={(event) => set({ status: event.target.value as ArTenant["status"] })}><option>Active</option><option>Inactive</option></select>
            </Field>
            <div className="flex items-end gap-2">
              <Button primary type="submit" disabled={action.busy}>Save tenant</Button>
              <Button onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </form>
        </Section>
      ) : null}
      <EmptyLedger book={book} />
      {book.tenants.length ? (
        <Section title={`${book.tenants.length} tenant(s)`} actions={<input aria-label="Search tenants" placeholder="Search" className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} />}>
          <Table min={1100}>
            <thead><tr><th>Code</th><th>Tenant</th><th>Entity</th><th>Property · building · unit</th><th>Lease</th><th>Terms</th><th className="text-right">Deposit held</th><th className="text-right">Outstanding</th><th className="text-right">Overdue</th><th>Owner</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((tenant) => {
                const balance = owed.get(tenant.id);
                return (
                  <tr key={tenant.id}>
                    <td className="font-semibold">{tenant.code}</td>
                    <td><Link to={`/estate/ar/tenants/${encodeURIComponent(tenant.id)}`} className="font-semibold text-navy underline-offset-2 hover:underline">{tenant.name}</Link><span className="block text-xs text-navy/50">{tenant.source.system}</span></td>
                    <td>{tenant.entityId}</td>
                    <td>{tenant.propertyName || tenant.propertyId} · {tenant.building || "—"} · {tenant.unit || "—"}</td>
                    <td>{leases.get(tenant.id)?.join(", ") ?? <span className="text-amber-700">No lease</span>}</td>
                    <td>{tenant.billingFrequency}, {tenant.paymentTermsDays} days</td>
                    <td className="text-right tabular-nums">{money(deposits.get(tenant.id) ?? 0, tenant.currency)}</td>
                    <td className="text-right tabular-nums">{money(balance?.outstanding ?? 0, tenant.currency)}</td>
                    <td className={`text-right tabular-nums ${balance?.overdue ? "!text-red-700" : ""}`}>{money(balance?.overdue ?? 0, tenant.currency)}</td>
                    <td>{tenant.collectionOwner}</td>
                    <td><Tag>{tenant.status}</Tag></td>
                    <td><SmallButton onClick={() => setDraft({ ...tenant })}>Edit</SmallButton></td>
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

export function TenantDetailPage() {
  const { tenantId = "" } = useParams();
  const { book, workspaceId } = useArBook();
  const action = useAction();
  const [deposit, setDeposit] = useState({ amount: "", date: today(), bank: "" });
  const [settle, setSettle] = useState<Record<string, string>>({});
  if (!book || !workspaceId) return null;
  const tenant = book.tenants.find((item) => item.id === decodeURIComponent(tenantId));
  if (!tenant) return <ArPage title="Tenant"><Empty>Tenant not found.</Empty></ArPage>;
  const asOf = today();
  const statement = statementOfAccount(book, tenant.id);
  const leases = book.leases.filter((lease) => lease.tenantId === tenant.id);
  const deposits = book.deposits.filter((item) => item.tenantId === tenant.id);
  const history = paymentHistory(book, asOf).get(tenant.id);
  const open = [...balances(book).values()].filter((balance) => balance.invoice.tenantId === tenant.id && balance.outstanding > 0);
  const followUps = book.followUps.filter((item) => item.tenantId === tenant.id);
  const unapplied = tenantBalances(book, asOf).get(tenant.id)?.unapplied ?? 0;
  const { tenantName } = nameMaps(book);

  return (
    <ArPage title={tenant.name} subtitle={`${tenant.code} · ${tenant.entityId} · ${tenant.propertyName || tenant.propertyId} · unit ${tenant.unit || "—"} · source ${tenant.source.system}`} crumbs={[{ label: "Tenant Register", to: "/estate/ar/tenants" }, { label: tenant.name }]}>
      <Feedback error={action.error} message={action.message} />
      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="Profile">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[["Contact", tenant.contactName || "—"], ["Email", tenant.email || "—"], ["Phone", tenant.phone || "—"], ["Billing", `${tenant.billingFrequency}, ${tenant.paymentTermsDays} days`], ["Currency", tenant.currency], ["Collection owner", tenant.collectionOwner], ["Paid late (settled)", history ? `${history.late} of ${history.settled}` : "—"], ["Average days late", history?.averageDaysLate ?? "—"]].map(([label, value]) => (
              <div key={String(label)}><dt className="text-[11px] uppercase tracking-[0.12em] text-navy/45">{label}</dt><dd className="font-medium text-navy">{value}</dd></div>
            ))}
          </dl>
        </Section>
        <Section title="Leases">
          {leases.length === 0 ? <p className="text-sm text-navy/60">No lease. <Link to="/estate/ar/leases" className="underline">Add one</Link>.</p> : leases.map((lease) => (
            <div key={lease.id} className="mb-3 text-sm">
              <p className="font-semibold text-navy">{lease.code} <Tag>{lease.status}</Tag></p>
              <p className="text-navy/60">{lease.start} to {lease.end} · {lease.currency}</p>
              <ul className="mt-1 text-xs text-navy/70">{lease.charges.map((charge) => <li key={charge.id}>{charge.description || charge.type}: {money(charge.amount, lease.currency)} {charge.frequency}{charge.escalationPct ? `, +${charge.escalationPct}%/yr` : ""}</li>)}</ul>
            </div>
          ))}
        </Section>
        <Section title="Security deposits" subtitle="Held as a liability (account 2200), never revenue.">
          <ul className="space-y-2 text-sm">
            {deposits.map((item) => (
              <li key={item.id} className="rounded-lg border border-navy/10 p-2">
                <div className="flex items-center justify-between"><span>{money(item.amount, item.currency)} · received {item.receivedDate}</span><Tag>{item.status}</Tag></div>
                {item.status === "Held" ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select aria-label="Apply deposit to invoice" className={`${inputClass} py-1 text-xs`} value={settle[item.id] ?? ""} onChange={(event) => setSettle({ ...settle, [item.id]: event.target.value })}>
                      <option value="">Refund to tenant</option>
                      {open.map((balance) => <option key={balance.invoice.id} value={balance.invoice.id}>Apply to {balance.invoice.number} ({money(balance.outstanding, balance.invoice.currency)})</option>)}
                    </select>
                    <SmallButton onClick={() => window.confirm("Settle this deposit? A journal will be posted.") && action.run(() => arService.settleDeposit(item.id, settle[item.id] ? { kind: "apply", date: asOf, invoiceId: settle[item.id] } : { kind: "refund", date: asOf }), "Deposit settled.")}>{settle[item.id] ? "Apply" : "Refund"}</SmallButton>
                  </div>
                ) : <p className="text-xs text-navy/50">{item.status} {item.settledDate}</p>}
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              action.run(() => arService.recordDeposit(workspaceId, { tenantId: tenant.id, leaseId: leases[0]?.id, amount: Number(deposit.amount), currency: tenant.currency, receivedDate: deposit.date, bankAccount: deposit.bank || book.settings.bankAccounts[0]?.name }), "Deposit recorded.").then((ok) => ok && setDeposit({ amount: "", date: today(), bank: "" }));
            }}
          >
            <input aria-label="Deposit amount" placeholder={`Amount (${tenant.currency})`} type="number" step="0.01" className={`${inputClass} w-32`} value={deposit.amount} onChange={(event) => setDeposit({ ...deposit, amount: event.target.value })} />
            <input aria-label="Deposit date" type="date" className={inputClass} value={deposit.date} onChange={(event) => setDeposit({ ...deposit, date: event.target.value })} />
            <select aria-label="Deposit bank account" className={inputClass} value={deposit.bank} onChange={(event) => setDeposit({ ...deposit, bank: event.target.value })}>{book.settings.bankAccounts.map((bank) => <option key={bank.name}>{bank.name}</option>)}</select>
            <Button type="submit" disabled={!deposit.amount}>Record deposit</Button>
          </form>
        </Section>
      </div>
      <Section title="Statement of account" subtitle={`In ${tenant.currency}. ${unapplied ? `${money(unapplied, tenant.currency)} received but not yet allocated is included as a credit.` : ""}`} actions={<Link to={`/estate/ar/payments?tenant=${encodeURIComponent(tenant.id)}`} className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Record receipt</Link>}>
        {statement.length === 0 ? <p className="text-sm text-navy/60">No posted transactions.</p> : (
          <Table>
            <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th className="text-right">Charges</th><th className="text-right">Credits</th><th className="text-right">Balance</th></tr></thead>
            <tbody>{statement.map((line, index) => <tr key={index}><td>{line.date}</td><td>{line.type}</td><td className="font-semibold">{line.reference}</td><td className="text-navy/70">{line.description}</td><td className="text-right tabular-nums">{line.debit ? money(line.debit, line.currency) : ""}</td><td className="text-right tabular-nums">{line.credit ? money(line.credit, line.currency) : ""}</td><td className="text-right tabular-nums">{money(line.balance, tenant.currency)}</td></tr>)}</tbody>
          </Table>
        )}
      </Section>
      <Section title="Follow-up history" actions={<Link to="/estate/ar/collections" className="text-xs font-semibold underline">Collections</Link>}>
        {followUps.length === 0 ? <p className="text-sm text-navy/60">No follow-ups logged for {tenantName(tenant.id)}.</p> : (
          <ul className="space-y-2 text-sm">{followUps.map((item) => <li key={item.id}><b>{item.date} · {item.type}</b> — {item.note} {item.promiseDate ? <span className="text-navy/60">Promise to pay by {item.promiseDate}.</span> : null} {item.reminderStatus ? <Tag tone={item.reminderStatus === "Draft" ? "Draft" : "Approved"}>{item.reminderStatus === "Draft" ? "Reminder draft — awaiting approval" : "Reminder approved — not sent automatically"}</Tag> : null}</li>)}</ul>
        )}
      </Section>
    </ArPage>
  );
}
