import { useState } from "react";
import { Link } from "react-router-dom";
import { ageing, bucketTotals, drill, type DrillLevel } from "@/ar/engine/analytics";
import { ageBuckets } from "@/ar/engine/types";
import { today, useArBook } from "@/ar/ui/hooks";
import { ArPage, EmptyLedger, Table, Tag, moneyShort, money, nameMaps } from "@/ar/ui/kit";
import { Section, inputClass } from "@/integrations/ui/components";

const levels: DrillLevel[] = ["entity", "property", "tenant", "invoice"];
const levelLabel: Record<DrillLevel, string> = { entity: "Entity", property: "Property", tenant: "Tenant", invoice: "Invoice" };

export function ArAgeingPage() {
  const { book } = useArBook();
  const [asOf, setAsOf] = useState(today());
  const [path, setPath] = useState<{ level: DrillLevel; key: string; label: string }[]>([]);
  if (!book) return null;
  const ccy = book.settings.groupCurrency;
  const { properties } = nameMaps(book);
  const all = ageing(book, asOf);
  const rows = all.filter((row) => path.every((step) => (step.level === "entity" ? row.invoice.entityId : step.level === "property" ? row.invoice.propertyId : row.invoice.tenantId) === step.key));
  const level = levels[path.length];
  const nodes = drill(rows, level, properties);
  const totals = bucketTotals(rows);
  const total = rows.reduce((sum, row) => sum + row.outstandingGroup, 0);

  return (
    <ArPage title="AR Ageing" subtitle={`Days past due at the as-of date, by bucket. Drill from group to entity, property, tenant, and invoice. ${ccy}; open foreign-currency balances at the closing rate.`} actions={<label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-navy/50">As of <input type="date" className={inputClass} value={asOf} onChange={(event) => setAsOf(event.target.value || today())} /></label>}>
      <EmptyLedger book={book} />
      <nav aria-label="Ageing drill-down" className="flex flex-wrap items-center gap-1 text-sm">
        <button type="button" className={`font-semibold ${path.length ? "text-navy underline" : "text-navy/60"}`} onClick={() => setPath([])}>Group</button>
        {path.map((step, index) => (
          <span key={step.key} className="flex items-center gap-1"><span className="text-navy/40">›</span><button type="button" className={`font-semibold ${index < path.length - 1 ? "text-navy underline" : "text-navy/60"}`} onClick={() => setPath(path.slice(0, index + 1))}>{levelLabel[step.level]}: {step.label}</button></span>
        ))}
      </nav>
      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {ageBuckets.map((bucket) => <article key={bucket} className="rounded-2xl border border-navy/10 bg-white p-3 shadow-card"><Tag tone={bucket}>{bucket === "Current" ? "Current" : `${bucket} days`}</Tag><p className="mt-2 font-serif text-xl text-navy">{moneyShort(totals[bucket], ccy)}</p></article>)}
        <article className="rounded-2xl border border-navy/10 bg-navy p-3 text-ivory shadow-card"><p className="text-[11px] uppercase tracking-[0.14em] text-ivory/60">Total</p><p className="mt-2 font-serif text-xl">{moneyShort(total, ccy)}</p></article>
      </section>

      {level !== "invoice" ? (
        <Section title={`By ${levelLabel[level].toLowerCase()}`} subtitle="Click a row to drill down.">
          <Table min={900}>
            <thead><tr><th>{levelLabel[level]}</th>{ageBuckets.map((bucket) => <th key={bucket} className="text-right">{bucket}</th>)}<th className="text-right">Total</th><th className="text-right">Invoices</th></tr></thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.key} className="cursor-pointer hover:bg-gold/5" onClick={() => setPath([...path, { level, key: node.key, label: node.label }])}>
                  <td className="font-semibold text-navy underline-offset-2 hover:underline">{node.label}</td>
                  {ageBuckets.map((bucket) => <td key={bucket} className={`text-right tabular-nums ${bucket !== "Current" && node.buckets[bucket] > 0 ? "!text-red-700" : ""}`}>{node.buckets[bucket] ? moneyShort(node.buckets[bucket], ccy) : "—"}</td>)}
                  <td className="text-right font-semibold tabular-nums">{moneyShort(node.total, ccy)}</td>
                  <td className="text-right">{node.count}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
      ) : (
        <Section title="Invoices">
          <Table min={1100}>
            <thead><tr><th>Invoice</th><th>Due</th><th className="text-right">Days past due</th><th>Bucket</th><th className="text-right">Outstanding</th><th className="text-right">{ccy}</th><th>Owner</th><th>Next follow-up</th><th>Promise to pay</th><th>Dispute</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const tenant = book.tenants.find((item) => item.id === row.invoice.tenantId);
                const notes = book.followUps.filter((item) => item.tenantId === row.invoice.tenantId && (!item.invoiceId || item.invoiceId === row.invoice.id));
                const next = notes.map((item) => item.nextFollowUp).filter(Boolean).sort().pop();
                const promise = notes.map((item) => item.promiseDate).filter(Boolean).sort().pop();
                return (
                  <tr key={row.invoice.id}>
                    <td><Link to={`/estate/ar/invoices/${encodeURIComponent(row.invoice.id)}`} className="font-semibold underline-offset-2 hover:underline">{row.invoice.number}</Link></td>
                    <td>{row.invoice.dueDate}</td>
                    <td className="text-right">{Math.max(row.daysPastDue, 0)}</td>
                    <td><Tag tone={row.bucket}>{row.bucket}</Tag></td>
                    <td className="text-right tabular-nums">{money(row.outstanding, row.invoice.currency)}</td>
                    <td className="text-right tabular-nums">{money(row.outstandingGroup, ccy)}</td>
                    <td>{tenant?.collectionOwner ?? "—"}</td>
                    <td>{next ?? "—"}</td>
                    <td className={promise && promise < asOf ? "!text-red-700" : ""}>{promise ?? "—"}{promise && promise < asOf ? " (missed)" : ""}</td>
                    <td>{row.disputed ? <Tag tone="Open">Disputed</Tag> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Section>
      )}
    </ArPage>
  );
}
