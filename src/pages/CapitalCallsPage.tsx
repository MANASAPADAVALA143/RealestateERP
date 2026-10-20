import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Donut, GroupedBars } from "@/components/charts";
import { Attention, CompanyFrame } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { getBook, type CallRow } from "@/lib/drillData";

const filters = ["All", "Outstanding", "Overdue", "Partial", "Paid"] as const;

export function CapitalCallsPage() {
  const { entityId = "" } = useParams();
  const book = getBook(entityId);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [asked, setAsked] = useState(false);
  const calls = book?.calls ?? [];
  const visible = useMemo(
    () => calls.filter((row) => filter === "All" || row.status === filter),
    [calls, filter],
  );
  if (!book) return <CompanyFrame entityId={entityId} page="Capital Calls"><p /></CompanyFrame>;
  const called = calls.reduce((sum, row) => sum + row.called, 0);
  const received = calls.reduce((sum, row) => sum + row.received, 0);
  const outstanding = calls.reduce((sum, row) => sum + row.outstanding, 0);
  const overdue = calls.filter((row) => row.status === "Overdue");
  const funded = called === 0 ? 0 : (received / called) * 100;

  return (
    <CompanyFrame entityId={entityId} page="Capital Calls">
      <Panel title="Called capital">
        <p className="font-serif text-3xl">{inrCr(called)}</p>
        <p className="mt-1 text-sm text-navy/60">{funded.toFixed(1)}% funded</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy/5">
          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(funded, 100)}%` }} />
        </div>
        <p className="mt-2 text-sm text-red-700">Outstanding {inrCr(outstanding)} — Awaiting collection</p>
        <p className="text-sm">Overdue: {overdue.length}</p>
      </Panel>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total called", inrCr(called)],
          ["Total received", inrCr(received)],
          ["Outstanding", inrCr(outstanding)],
          ["Overdue", String(overdue.length)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-navy/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{label}</p>
            <p className="mt-2 font-serif text-2xl">{value}</p>
          </article>
        ))}
      </section>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>
            {item}
          </button>
        ))}
      </div>
      <Panel title="Calls" bleed>
        <CallTable rows={visible} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Called vs received vs outstanding" subtitle="Navy is called. Gold is received.">
          <GroupedBars
            rows={calls.map((row) => ({
              label: row.partner,
              a: row.called,
              b: row.received,
              aText: inrCr(row.called),
              bText: inrCr(row.received),
            }))}
          />
        </Panel>
        <Panel title="Outstanding by partner">
          <Donut slices={calls.filter((row) => row.outstanding > 0).map((row) => ({ name: row.partner, value: row.outstanding }))} />
        </Panel>
      </div>
      <Panel title="Needs attention">
        <Attention
          items={[
            ...calls.filter((row) => row.due === "—").map((row) => ({ text: `${row.partner} has no due date assigned` })),
            ...overdue.map((row) => ({ text: `${row.partner} is overdue`, value: inrCr(row.outstanding) })),
          ]}
        />
      </Panel>
      <Panel title="AI capital calls">
        <button type="button" onClick={() => setAsked(true)} className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy">
          Ask AI
        </button>
        {asked ? <p className="mt-3 text-sm text-navy/70">AI review is a placeholder on this demo. The queue above is the source list.</p> : null}
      </Panel>
    </CompanyFrame>
  );
}

function CallTable({ rows }: { rows: CallRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[760px]">
        <thead>
          <tr>
            <th>Partner</th>
            <th className="text-right">Amount called</th>
            <th className="text-right">Received</th>
            <th className="text-right">Outstanding</th>
            <th>Due date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium">{row.partner}</td>
              <td className="text-right tabular-nums">{inrCr(row.called)}</td>
              <td className="text-right tabular-nums">{inrCr(row.received)}</td>
              <td className="text-right tabular-nums">{inrCr(row.outstanding)}</td>
              <td>{row.due}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
