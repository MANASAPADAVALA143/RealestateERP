import { Link } from "react-router-dom";
import { ArGroupSummary } from "@/ar/ui/embeds";
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
  const { sorted, toggle } = useSort(receivables);
  const total = 184;

  return (
    <div className="space-y-6">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Receivables" }]} />
      <div>
        <h2 className="font-serif text-3xl text-navy">Receivables & collections</h2>
        <p className="mt-1 text-sm text-navy/60">Consolidated group receivables. Rental receivables come from the Real Estate AR ledger; the overdue book below is illustrative demo data for the group's other businesses.</p>
      </div>

      <ArGroupSummary title="Rental receivables (all entities)" />

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
        <div className="border-b border-navy/5 px-5 py-3 text-xs text-navy/60">
          Illustrative overdue book (₹). A receivable is only marked collected when a receipt is recorded:{" "}
          <Link to="/estate/ar/payments" className="font-semibold text-navy underline">record receipts in Payment Allocation</Link>, which creates the payment, allocation, and journal.
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1000px]">
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
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="even:bg-ivory/60">
                  <td className="font-medium">{row.customer}</td>
                  <td>{row.entity}</td>
                  <td>{row.invoice}</td>
                  <td>{row.due}</td>
                  <td className="text-right tabular-nums">{fmtLakh(row.amount)}</td>
                  <td className="text-right tabular-nums">{row.days}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bucketClass[row.bucket]}`}>{row.bucket}</span></td>
                  <td>{row.owner}</td>
                  <td className={statusClass[row.status]}>{row.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className="text-right tabular-nums">₹81 L</td>
                <td colSpan={4} />
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
