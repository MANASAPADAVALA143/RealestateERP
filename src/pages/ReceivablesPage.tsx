import { useMemo, useState } from "react";
import { Crumb, useSort } from "@/components/drill";
import { ageing, fmtLakh, receivables, type Receivable } from "@/lib/commandData";

const bucketClass: Record<Receivable["bucket"], string> = {
  "31-60": "bg-amber-100 text-amber-900",
  "61-90": "bg-orange-100 text-orange-900",
  "90+": "bg-red-100 text-red-800",
};

const statusClass: Record<string, string> = {
  "Follow-up sent": "text-amber-700",
  "Promise: 25 Oct": "text-navy",
  Escalated: "text-orange-700",
  "Legal notice": "text-red-700",
  Disputed: "text-red-700",
  "No response": "text-amber-700",
  "Write-off review": "text-red-700",
  "Last reminder": "text-amber-800",
};

export function ReceivablesPage() {
  const [collected, setCollected] = useState<Record<string, boolean>>({});
  const { sorted, toggle } = useSort(receivables);
  const open = useMemo(() => receivables.filter((row) => !collected[row.id]), [collected]);
  const remaining = open.reduce((sum, row) => sum + row.amount, 0);
  const total = 184;

  return (
    <div className="space-y-6">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Receivables" }]} />
      <div>
        <h2 className="font-serif text-3xl text-navy">Receivables & collections</h2>
        <p className="mt-1 text-sm text-navy/60">Overdue book as of 20 Oct 2026. Illustrative demo data.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total outstanding" value="₹1.84 Cr" />
        <Summary label="Overdue (>30 days)" value="₹74 L" alert />
        <Summary label="Collected MTD" value="₹1.12 Cr" />
      </section>
      <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
        <h3 className="font-serif text-xl text-navy">Ageing buckets</h3>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full">
          {ageing.map((bucket) => (
            <div key={bucket.label} className={bucket.className} style={{ width: `${(bucket.lakh / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ageing.map((bucket) => (
            <li key={bucket.label} className="text-sm">
              <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${bucket.className}`} />
              <span className="font-semibold">{bucket.label}</span>
              <p className="mt-1 tabular-nums text-navy/70">{fmtLakh(bucket.lakh)} · {((bucket.lakh / total) * 100).toFixed(1)}%</p>
            </li>
          ))}
        </ul>
      </section>
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <SortHead label="Customer" onClick={() => toggle("customer")} />
                <SortHead label="Entity" onClick={() => toggle("entity")} />
                <th>Invoice date</th>
                <th>Due date</th>
                <SortHead label="Amount" align="right" onClick={() => toggle("amount")} />
                <SortHead label="Days overdue" align="right" onClick={() => toggle("days")} />
                <th>Ageing bucket</th>
                <th>Collection owner</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const done = collected[row.id];
                return (
                  <tr key={row.id} className="even:bg-ivory/60">
                    <td className={`font-medium ${done ? "line-through opacity-60" : ""}`}>{row.customer}</td>
                    <td className={done ? "line-through opacity-60" : ""}>{row.entity}</td>
                    <td className={done ? "line-through opacity-60" : ""}>{row.invoice}</td>
                    <td className={done ? "line-through opacity-60" : ""}>{row.due}</td>
                    <td className={`text-right tabular-nums ${done ? "line-through opacity-60" : ""}`}>{fmtLakh(row.amount)}</td>
                    <td className={`text-right tabular-nums ${done ? "line-through opacity-60" : ""}`}>{row.days}</td>
                    <td className={done ? "line-through opacity-60" : ""}><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bucketClass[row.bucket]}`}>{row.bucket}</span></td>
                    <td className={done ? "line-through opacity-60" : ""}>{row.owner}</td>
                    <td className={done ? "" : statusClass[row.status]}>
                      {done ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 no-underline">Collected</span> : row.status}
                    </td>
                    <td className="no-underline">
                      {done ? null : (
                        <button type="button" onClick={() => setCollected((current) => ({ ...current, [row.id]: true }))} className="rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-navy/20">
                          Mark collected
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total{open.length === receivables.length ? "" : ` · remaining ${fmtLakh(remaining)}`}</td>
                <td className="text-right tabular-nums">{open.length === receivables.length ? "₹81 L" : fmtLakh(remaining)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <article className="rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
      <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{label}</p>
      <p className={`mt-1 font-serif text-3xl ${alert ? "text-red-700" : "text-navy"}`}>{value}</p>
    </article>
  );
}

function SortHead({ label, onClick, align }: { label: string; onClick: () => void; align?: "right" }) {
  return (
    <th className={align === "right" ? "text-right" : undefined}>
      <button type="button" onClick={onClick} className="uppercase tracking-[0.14em]">{label}</button>
    </th>
  );
}
