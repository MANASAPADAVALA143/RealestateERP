import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Settings } from "lucide-react";
import { Crumb } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import {
  auditLog,
  crToLakh,
  paymentHistory,
  recordPayment,
  resolveLoan,
  scheduleFor,
  type LoanFile,
} from "@/lib/loanFile";

const tabs = ["Overview", "Payment History", "Audit Log", "Documents"] as const;

const actionClass: Record<string, string> = {
  Payment: "bg-blue-50 text-blue-800 ring-blue-700/15",
  Updated: "bg-navy/5 text-navy/70 ring-navy/10",
  Created: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
};

const categoryClass: Record<string, string> = {
  "Payment Entry": "bg-blue-50 text-blue-800 ring-blue-700/15",
  "Data Update": "bg-navy/5 text-navy/70 ring-navy/10",
  "Loan Created": "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
};

export function LoanDetailPage() {
  const { entityId, loanId = "" } = useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [tick, setTick] = useState(0);
  const [docNote, setDocNote] = useState("");
  const [comment, setComment] = useState("");
  const file = resolveLoan(loanId);
  if (!file || (entityId && file.entityId.toUpperCase() !== entityId.toUpperCase())) {
    return <p className="text-sm text-navy/70">That loan is not on this register.</p>;
  }
  void tick;
  const schedule = scheduleFor(file);
  const shown = schedule.slice(0, 36);
  const interestTotal = schedule.reduce((sum, row) => sum + row.interest, 0);
  const costTotal = schedule.reduce((sum, row) => sum + row.payment, 0);
  const history = paymentHistory(file);
  const paid = history.reduce((sum, row) => sum + row.amount, 0);
  const principalPaid = history.reduce((sum, row) => sum + row.principal, 0);
  const interestPaid = history.reduce((sum, row) => sum + row.interest, 0);
  const net = file.market - file.outstanding;
  const log = auditLog(file);

  return (
    <div className="space-y-5">
      <Crumb
        items={[
          { label: "Group CFO", to: "/" },
          { label: file.entityId, to: `/companies/${file.entityId}` },
          { label: "loans", to: `/companies/${file.entityId}/loans` },
          { label: file.name },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/50">
            {file.typeLabel} · {file.lenderShort}
          </p>
          <h2 className="mt-1 font-serif text-3xl text-navy">{file.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-700/15">{file.status}</span>
            <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-semibold text-navy ring-1 ring-inset ring-navy/10">{file.direction}</span>
          </div>
          <Link to={`/companies/${file.entityId}/loans`} className="mt-3 inline-block text-sm font-semibold text-navy">
            ← All loans & notes
          </Link>
        </div>
        <div className="flex gap-2">
          <Link to={`/loans/${file.id}/edit`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-navy ring-1 ring-inset ring-navy/15">
            <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => {
              recordPayment(file);
              setTick((value) => value + 1);
              setTab("Payment History");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Record Payment
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? <Overview file={file} shown={shown} months={schedule.length} interestTotal={interestTotal} costTotal={costTotal} net={net} /> : null}
      {tab === "Payment History" ? <History history={history} paid={paid} principalPaid={principalPaid} interestPaid={interestPaid} /> : null}
      {tab === "Audit Log" ? <Audit rows={log} /> : null}
      {tab === "Documents" ? (
        <Documents note={docNote} comment={comment} onNote={() => setDocNote("The document vault is not connected in this demo.")} onComment={setComment} saved={file.notes} />
      ) : null}
    </div>
  );
}

function Overview({
  file,
  shown,
  months,
  interestTotal,
  costTotal,
  net,
}: {
  file: LoanFile;
  shown: ReturnType<typeof scheduleFor>;
  months: number;
  interestTotal: number;
  costTotal: number;
  net: number;
}) {
  return (
    <div className="space-y-6">
      <Panel title="Lender">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Lender" value={file.lenderShort} />
          <Field label="Guarantor" value={file.guarantor} />
          <Field label="Contact" value={file.contact} />
          <Field label="Email" value={file.email} />
        </dl>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-navy/45">Phone</p>
        <a href={`tel:${file.phone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-block font-semibold text-navy">
          {file.phone}
        </a>
      </Panel>

      <Panel title="Linked asset" bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Property / asset</th>
                <th className="text-right">Market value</th>
                <th className="text-right">Equity deployed</th>
                <th className="text-right">Loan to value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">{file.asset}</td>
                <td className="text-right tabular-nums">{inrCr(file.market)}</td>
                <td className="text-right tabular-nums">{inrCr(file.equity)}</td>
                <td className="text-right tabular-nums">{file.ltv.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-5 py-4 text-sm">
          Net position <span className="font-serif text-2xl text-navy">{inrCr(net)}</span>
          <span className="ml-2 text-navy/50">Market value minus outstanding {inrCr(file.outstanding)}</span>
        </p>
      </Panel>

      <Panel title="Amortization schedule" subtitle={`Showing first ${shown.length} of ${months} months`}>
        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-navy/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">EMI / month</p>
            <p className="mt-1 font-serif text-2xl text-navy">{crToLakh(file.emi)}</p>
          </article>
          <article className="rounded-xl border border-gold/40 bg-gold/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Total interest</p>
            <p className="mt-1 font-serif text-2xl text-amber-700">{crToLakh(interestTotal)}</p>
          </article>
          <article className="rounded-xl border border-navy/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Total cost</p>
            <p className="mt-1 font-serif text-2xl text-navy">{crToLakh(costTotal)}</p>
          </article>
        </section>
        <div className="max-h-[28rem] overflow-auto">
          <table className="data-table min-w-[720px]">
            <thead className="sticky top-0">
              <tr>
                <th>Month</th>
                <th className="text-right">Payment</th>
                <th className="text-right">Principal</th>
                <th className="text-right">Interest</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td className="text-right tabular-nums">{crToLakh(row.payment)}</td>
                  <td className="text-right tabular-nums text-navy">{crToLakh(row.principal)}</td>
                  <td className="text-right tabular-nums text-amber-700">{crToLakh(row.interest)}</td>
                  <td className="text-right tabular-nums">{crToLakh(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function History({
  history,
  paid,
  principalPaid,
  interestPaid,
}: {
  history: ReturnType<typeof paymentHistory>;
  paid: number;
  principalPaid: number;
  interestPaid: number;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Total paid</p>
          <p className="mt-1 font-serif text-2xl">{crToLakh(paid)}</p>
        </article>
        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Principal repaid</p>
          <p className="mt-1 font-serif text-2xl text-navy">{crToLakh(principalPaid)}</p>
        </article>
        <article className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Interest paid</p>
          <p className="mt-1 font-serif text-2xl text-amber-700">{crToLakh(interestPaid)}</p>
        </article>
      </section>
      <Panel title="Payments" bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Date paid</th>
                <th>EMI date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Principal</th>
                <th className="text-right">Interest</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={`${row.n}-${row.datePaid}`}>
                  <td>{row.n}</td>
                  <td>{row.datePaid}</td>
                  <td>{row.emiDate}</td>
                  <td className="text-right tabular-nums">{crToLakh(row.amount)}</td>
                  <td className="text-right tabular-nums text-navy">{crToLakh(row.principal)}</td>
                  <td className="text-right tabular-nums text-amber-700">{crToLakh(row.interest)}</td>
                  <td>{row.recorded}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <td className="text-right tabular-nums">{crToLakh(paid)}</td>
                <td className="text-right tabular-nums">{crToLakh(principalPaid)}</td>
                <td className="text-right tabular-nums">{crToLakh(interestPaid)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Audit({ rows }: { rows: ReturnType<typeof auditLog> }) {
  return (
    <Panel title="Audit log" subtitle={`${rows.length} entries · most recent first`} bleed>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[920px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Date & time</th>
              <th>Details</th>
              <th>Action</th>
              <th>Category</th>
              <th>Changed by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.n}>
                <td>{row.n}</td>
                <td className="whitespace-nowrap">{row.when}</td>
                <td>
                  <span className="inline-flex rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-ivory">{row.entity}</span>
                  <p className="mt-1 text-navy/80">{row.detail}</p>
                </td>
                <td><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${actionClass[row.action]}`}>{row.action}</span></td>
                <td><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${categoryClass[row.category]}`}>{row.category}</span></td>
                <td>{row.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Documents({
  note,
  comment,
  saved,
  onNote,
  onComment,
}: {
  note: string;
  comment: string;
  saved: string;
  onNote: () => void;
  onComment: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Panel title="Supporting documents">
        <p className="text-sm text-navy/70">
          No documents attached yet. The loan agreement, promissory note, amortisation schedule and closing documents all live here.
        </p>
        <button type="button" onClick={onNote} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">
          + Add or remove documents
        </button>
        {note ? <p className="mt-3 text-sm text-navy/60">{note}</p> : null}
      </Panel>
      <Panel title="Notes & comments">
        <textarea
          value={comment || saved}
          onChange={(event) => onComment(event.target.value)}
          placeholder="Terms, collateral, context..."
          className="min-h-28 w-full rounded-xl border border-navy/15 px-3 py-2 text-sm"
        />
      </Panel>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-navy">{value}</dd>
    </div>
  );
}
