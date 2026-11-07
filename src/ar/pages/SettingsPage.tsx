import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { defaultAccounts } from "@/ar/engine/ledger";
import { ageBuckets, type AccountKey, type ArSettings } from "@/ar/engine/types";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";
import { ArPage, Feedback, Field, SmallButton, Table } from "@/ar/ui/kit";
import { Button, Notice, Section, inputClass } from "@/integrations/ui/components";
import { useAsync } from "@/integrations/ui/hooks";

const accountLabels: Record<AccountKey, string> = {
  receivables: "Tenant receivables (asset)",
  unapplied: "Unapplied receipts (liability)",
  deposits: "Security deposits held (liability)",
  base_rent: "Rental revenue",
  cam: "CAM recoveries",
  utilities: "Utility recoveries",
  maintenance: "Maintenance recoveries",
  parking: "Parking income",
  other: "Other lease income",
  late_fee: "Late payment charges",
  bad_debt: "Bad debt expense",
  fx: "FX gain / loss",
  opening: "Opening balance clearing (imports)",
};

export function ArSettingsPage() {
  const { book, workspaceId } = useArBook();
  const [draft, setDraft] = useState<ArSettings | null>(null);
  const [cutover, setCutover] = useState(today());
  const action = useAction();
  const preview = useAsync(async () => (workspaceId ? arService.importPreview(workspaceId) : undefined), [workspaceId]);
  useEffect(() => {
    if (book && !draft) setDraft(structuredClone(book.settings));
  }, [book, draft]);
  if (!book || !workspaceId || !draft) return null;
  const set = (patch: Partial<ArSettings>) => setDraft({ ...draft, ...patch });
  const plan = preview.data?.plan;
  const available = preview.data?.available;
  const entities = [...new Set([...book.tenants.map((tenant) => tenant.entityId), ...Object.keys(draft.entityCurrencies)])].filter(Boolean).sort();

  return (
    <ArPage title="AR Settings" subtitle="Currencies, exchange rates, GL accounts, bank accounts, terms, late charges, expected loss rates, approvals, and imports from Data Integrations.">
      <Feedback error={action.error} message={action.message} />

      <Section title="Import from Data Integrations" subtitle="Published Tenant Master, Lease Register, Rent Charges, Accounts Receivable, and Credit Notes from Yardi Voyager, an ERP, or Excel. Records created in EstateCFO are never overwritten, and codes from different sources are not assumed to be the same tenant.">
        {available ? (
          <div className="space-y-3 text-sm">
            <p className="text-navy/70">Published: {available.tenants} tenant master · {available.leases} lease register · {available.charges} rent charges · {available.invoices} receivables · {available.credits} credit notes · {available.receipts} receipts and {available.bank} bank inflows (matched in <Link to="/estate/ar/payments" className="underline">Payment Allocation</Link>) · {available.ageing} ageing rows (reconciled in <Link to="/estate/ar/reports" className="underline">AR Reports</Link>).</p>
            {plan ? (
              <Table min={700}>
                <thead><tr><th>Will bring in</th><th className="text-right">New</th><th className="text-right">Updated (same source)</th></tr></thead>
                <tbody>
                  <tr><td>Tenants</td><td className="text-right">{plan.tenants.add.length}</td><td className="text-right">{plan.tenants.update.length}</td></tr>
                  <tr><td>Leases and charges</td><td className="text-right">{plan.leases.add.length}</td><td className="text-right">{plan.leases.update.length}</td></tr>
                  <tr><td>Open invoices (posted as opening balances)</td><td className="text-right">{plan.invoices.length}</td><td className="text-right">—</td></tr>
                  <tr><td>Credit notes (drafts for approval)</td><td className="text-right">{plan.creditNotes.length}</td><td className="text-right">—</td></tr>
                </tbody>
              </Table>
            ) : null}
            {plan?.skipped.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs"><p className="font-semibold">{plan.skipped.length} record(s) will not be brought in</p><ul className="mt-1 list-disc pl-5">{plan.skipped.map((item, index) => <li key={index}>{item.kind} {item.reference}: {item.reason}</li>)}</ul></div> : null}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Cutover date for opening balances"><input aria-label="Cutover date" type="date" className={inputClass} value={cutover} onChange={(event) => setCutover(event.target.value)} /></Field>
              <Button primary disabled={action.busy || !plan || plan.tenants.add.length + plan.tenants.update.length + plan.leases.add.length + plan.leases.update.length + plan.invoices.length + plan.creditNotes.length === 0} onClick={() => window.confirm("Bring these records into the AR ledger? Open invoices will be posted as opening balances.") && action.run(async () => { const result = await arService.bringIn(workspaceId, cutover); return result; }, "Imported into AR.")}>Bring into AR</Button>
              <Link to="/data-integrations/yardi" className="text-xs font-semibold underline">Import from Yardi</Link>
              <Link to="/data-integrations/import?category=tenant_master" className="text-xs font-semibold underline">Import from Excel / CSV</Link>
            </div>
          </div>
        ) : <p className="text-sm text-navy/60">Loading…</p>}
      </Section>

      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); action.run(() => arService.saveSettings(draft, "AR settings updated."), "Settings saved."); }}>
        <div className="grid gap-5 xl:grid-cols-2">
          <Section title="Currencies" subtitle="Every invoice and receipt keeps its transaction currency, the entity's functional currency, the group reporting currency, the exchange rates, and the reporting period.">
            <div className="flex flex-wrap gap-4">
              <Field label="Group reporting currency"><input aria-label="Group currency" maxLength={3} className={`${inputClass} w-24 uppercase`} value={draft.groupCurrency} onChange={(event) => set({ groupCurrency: event.target.value.toUpperCase() })} /></Field>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/50">Entity functional currency</p>
            <table className="data-table mt-1 text-sm"><tbody>{entities.map((entity) => <tr key={entity}><td>{entity}</td><td><input aria-label={`Functional currency ${entity}`} maxLength={3} className={`${inputClass} w-20 uppercase`} placeholder={draft.groupCurrency} value={draft.entityCurrencies[entity] ?? ""} onChange={(event) => set({ entityCurrencies: { ...draft.entityCurrencies, [entity]: event.target.value.toUpperCase() } })} /></td></tr>)}</tbody></table>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/50">Exchange rates (1 unit = rate × {draft.groupCurrency})</p>
            <table className="data-table mt-1 text-sm">
              <thead><tr><th>Currency</th><th>Period</th><th>Rate</th><th /></tr></thead>
              <tbody>
                {draft.fxRates.map((rate, index) => (
                  <tr key={index}>
                    <td><input aria-label={`Rate ${index + 1} currency`} maxLength={3} className={`${inputClass} w-20 uppercase`} value={rate.currency} onChange={(event) => set({ fxRates: draft.fxRates.map((item, at) => (at === index ? { ...item, currency: event.target.value.toUpperCase() } : item)) })} /></td>
                    <td><input aria-label={`Rate ${index + 1} period`} type="month" className={inputClass} value={rate.period} onChange={(event) => set({ fxRates: draft.fxRates.map((item, at) => (at === index ? { ...item, period: event.target.value } : item)) })} /></td>
                    <td><input aria-label={`Rate ${index + 1} value`} type="number" step="0.0001" className={`${inputClass} w-28`} value={rate.rate} onChange={(event) => set({ fxRates: draft.fxRates.map((item, at) => (at === index ? { ...item, rate: Number(event.target.value) } : item)) })} /></td>
                    <td><SmallButton tone="danger" onClick={() => set({ fxRates: draft.fxRates.filter((_, at) => at !== index) })}>Remove</SmallButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2"><SmallButton onClick={() => set({ fxRates: [...draft.fxRates, { currency: "", period: today().slice(0, 7), rate: 1 }] })}>+ Add rate</SmallButton></div>
            <p className="mt-2 text-xs text-navy/50">Rates are entered by you; EstateCFO does not fetch or guess them. Posting stops with a clear message when a rate is missing.</p>
          </Section>

          <Section title="GL accounts" subtitle="Accounts used in AR journals. Map them to your chart of accounts.">
            <table className="data-table text-sm">
              <tbody>
                {(Object.keys(defaultAccounts) as AccountKey[]).map((key) => (
                  <tr key={key}>
                    <td className="text-navy/70">{accountLabels[key]}</td>
                    <td><input aria-label={`${accountLabels[key]} code`} className={`${inputClass} w-20`} value={draft.accounts[key].code} onChange={(event) => set({ accounts: { ...draft.accounts, [key]: { ...draft.accounts[key], code: event.target.value } } })} /></td>
                    <td><input aria-label={`${accountLabels[key]} name`} className={`${inputClass} w-full`} value={draft.accounts[key].name} onChange={(event) => set({ accounts: { ...draft.accounts, [key]: { ...draft.accounts[key], name: event.target.value } } })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section title="Bank accounts">
            <table className="data-table text-sm">
              <thead><tr><th>Name</th><th>GL code</th><th>Currency</th><th /></tr></thead>
              <tbody>
                {draft.bankAccounts.map((bank, index) => (
                  <tr key={index}>
                    <td><input aria-label={`Bank ${index + 1} name`} className={`${inputClass} w-full`} value={bank.name} onChange={(event) => set({ bankAccounts: draft.bankAccounts.map((item, at) => (at === index ? { ...item, name: event.target.value } : item)) })} /></td>
                    <td><input aria-label={`Bank ${index + 1} code`} className={`${inputClass} w-20`} value={bank.code} onChange={(event) => set({ bankAccounts: draft.bankAccounts.map((item, at) => (at === index ? { ...item, code: event.target.value } : item)) })} /></td>
                    <td><input aria-label={`Bank ${index + 1} currency`} maxLength={3} className={`${inputClass} w-20 uppercase`} value={bank.currency} onChange={(event) => set({ bankAccounts: draft.bankAccounts.map((item, at) => (at === index ? { ...item, currency: event.target.value.toUpperCase() } : item)) })} /></td>
                    <td><SmallButton tone="danger" onClick={() => set({ bankAccounts: draft.bankAccounts.filter((_, at) => at !== index) })}>Remove</SmallButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2"><SmallButton onClick={() => set({ bankAccounts: [...draft.bankAccounts, { name: "", code: "", currency: draft.groupCurrency }] })}>+ Add bank account</SmallButton></div>
          </Section>

          <Section title="Terms, late charges, and expected losses">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Default payment terms (days)"><input aria-label="Default terms" type="number" min={0} className={`${inputClass} w-full`} value={draft.defaultTermsDays} onChange={(event) => set({ defaultTermsDays: Number(event.target.value) })} /></Field>
              <Field label="Late charges"><select aria-label="Late charges enabled" className={`${inputClass} w-full`} value={draft.lateFee.enabled ? "on" : "off"} onChange={(event) => set({ lateFee: { ...draft.lateFee, enabled: event.target.value === "on" } })}><option value="on">On</option><option value="off">Off</option></select></Field>
              <Field label="Grace days"><input aria-label="Grace days" type="number" min={0} className={`${inputClass} w-full`} value={draft.lateFee.graceDays} onChange={(event) => set({ lateFee: { ...draft.lateFee, graceDays: Number(event.target.value) } })} /></Field>
              <Field label="Percent of overdue balance"><input aria-label="Late percent" type="number" step="0.1" min={0} className={`${inputClass} w-full`} value={draft.lateFee.percent} onChange={(event) => set({ lateFee: { ...draft.lateFee, percent: Number(event.target.value) } })} /></Field>
              <Field label="Flat amount"><input aria-label="Late flat" type="number" min={0} className={`${inputClass} w-full`} value={draft.lateFee.flat} onChange={(event) => set({ lateFee: { ...draft.lateFee, flat: Number(event.target.value) } })} /></Field>
              <Field label="Minimum"><input aria-label="Late minimum" type="number" min={0} className={`${inputClass} w-full`} value={draft.lateFee.minimum} onChange={(event) => set({ lateFee: { ...draft.lateFee, minimum: Number(event.target.value) } })} /></Field>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/50">Expected loss rate by ageing bucket (bad debt exposure)</p>
            <div className="mt-1 flex flex-wrap gap-3">{ageBuckets.map((bucket) => <Field key={bucket} label={bucket}><input aria-label={`Loss rate ${bucket}`} type="number" step="0.5" min={0} max={100} className={`${inputClass} w-20`} value={draft.allowance[bucket]} onChange={(event) => set({ allowance: { ...draft.allowance, [bucket]: Number(event.target.value) } })} /></Field>)}</div>
          </Section>
        </div>

        <Section title="Approvals and period control">
          <div className="flex flex-wrap gap-6 text-sm">
            {(["invoices", "creditNotes", "reversals"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={draft.approvals[key]} onChange={(event) => set({ approvals: { ...draft.approvals, [key]: event.target.checked } })} />Require approval for {key === "creditNotes" ? "credit notes and write-offs" : key === "invoices" ? "invoices before posting" : "receipt and invoice reversals"}</label>
            ))}
          </div>
          <Notice tone="sky">Locked periods ({book.lockedPeriods.join(", ") || "none"}) are shared with Data Integrations and block AR posting, receipts, credits, and reversals in those months. <Link to="/data-integrations/settings" className="font-semibold underline">Manage period locks</Link>. Approvals are recorded with the user name; this single-user browser deployment cannot enforce separate approvers.</Notice>
        </Section>
        <div className="flex gap-2"><Button primary type="submit" disabled={action.busy}>Save settings</Button><Button onClick={() => setDraft(structuredClone(book.settings))}>Discard changes</Button></div>
      </form>
    </ArPage>
  );
}
