import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Crumb } from "@/components/drill";
import { fmtLakh } from "@/lib/commandData";

const available = 320;

export function DecisionSimulatorPage() {
  const [invest, setInvest] = useState(200);
  const [payments, setPayments] = useState(80);
  const [collections, setCollections] = useState(110);
  const [buffer, setBuffer] = useState(100);
  const [open, setOpen] = useState(false);

  const result = available + collections - payments - invest;
  const conservative = Math.round(invest * 0.5);
  const aggressive = Math.min(Math.round(invest * 1.5), available);
  const after = (amount: number) => available + collections - payments - amount;
  const recommendation = useMemo(() => recommend(result, buffer, conservative), [result, buffer, conservative]);

  return (
    <div className="space-y-6">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Decision Simulator" }]} />
      <div>
        <h2 className="font-serif text-3xl text-navy">Decision Simulator</h2>
        <p className="mt-1 text-sm text-navy/60">Test capital allocation decisions before committing</p>
      </div>
      <section>
        <h3 className="font-serif text-2xl text-navy">What if we invest in expansion?</h3>
        <p className="text-sm text-navy/55">Interactive scenario · amounts in ₹ lakh · illustrative figures</p>
      </section>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 rounded-2xl border border-navy/10 bg-white p-5 shadow-card lg:col-span-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Available group cash</p>
            <p className="mt-1 font-serif text-3xl text-navy">₹320 L</p>
          </div>
          <label className="block text-sm font-semibold">
            How much to invest?
            <input type="range" min={0} max={500} step={10} value={invest} onChange={(event) => setInvest(Number(event.target.value))} className="mt-2 w-full accent-gold" />
            <p className="mt-1 font-serif text-2xl">{fmtLakh(invest)}</p>
          </label>
          <div className="flex flex-wrap gap-2">
            {[50, 100, 200, 500].map((amount) => (
              <button key={amount} type="button" onClick={() => setInvest(amount)} className="rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-navy/15">
                {amount >= 100 ? `₹${amount / 100} Cr` : `₹${amount} L`}
              </button>
            ))}
          </div>
          <NumberField label="Payments due in 30 days" value={payments} onChange={setPayments} />
          <NumberField label="Collections expected in 30 days" value={collections} onChange={setCollections} />
          <label className="block text-sm font-semibold">
            Minimum buffer to maintain
            <input type="range" min={50} max={200} step={10} value={buffer} onChange={(event) => setBuffer(Number(event.target.value))} className="mt-2 w-full accent-gold" />
            <p className="mt-1 font-serif text-xl">{fmtLakh(buffer)}</p>
          </label>
        </div>
        <div className="space-y-4 lg:col-span-3">
          <Result cash={result} buffer={buffer} />
          <div className="grid gap-3 md:grid-cols-3">
            <Scenario title="Conservative" note="Invest 50% of the proposal" amount={conservative} cash={after(conservative)} buffer={buffer} />
            <Scenario title="Base" note="Current slider" amount={invest} cash={result} buffer={buffer} highlight />
            <Scenario title="Aggressive" note="150% of the proposal, capped at available cash" amount={aggressive} cash={after(aggressive)} buffer={buffer} />
          </div>
          <article className="rounded-2xl bg-navy p-5 text-ivory shadow-card">
            <h3 className="flex items-center gap-2 font-serif text-2xl">
              <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
              Strategic recommendation
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ivory/90">{recommendation}</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-full bg-ivory px-4 py-2 text-xs font-semibold text-navy">
              Generate full report
            </button>
          </article>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-navy/45">
        Simplified illustrative scenario only. Does not include timing differences, restricted balances, tax obligations, debt service or forecast uncertainty. Use in conjunction with detailed cash flow projections.
      </p>
      {open ? (
        <Memo
          invest={invest}
          payments={payments}
          collections={collections}
          buffer={buffer}
          result={result}
          conservative={conservative}
          aggressive={aggressive}
          after={after}
          recommendation={recommendation}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function recommend(result: number, buffer: number, conservative: number): string {
  if (result > buffer + 50) {
    return "Based on current liquidity, the group can support this investment without disrupting operations. PCS and LBH have tighter cash positions — ensure intercompany support is not required. Recommended: proceed with Base scenario. Review again if collections miss by more than 20%.";
  }
  if (result >= buffer) {
    return "The investment is feasible but leaves limited headroom. Any collection shortfall or unexpected expense could breach the minimum buffer. Recommended: delay ₹30-50 L of the investment until November collections are confirmed, or draw on the Axis OD facility (₹2.50 Cr available).";
  }
  return `This investment creates a projected cash shortfall. The group would need to either delay payments, draw on credit facilities, or reduce the investment amount. Consider the Conservative scenario (${fmtLakh(conservative)}) which maintains the buffer. Do not proceed at the current investment level without confirming credit availability.`;
}

function Result({ cash, buffer }: { cash: number; buffer: number }) {
  if (cash < 0) {
    return (
      <article className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-red-800">Projected cash after</p>
        <p className="mt-1 font-serif text-4xl text-red-700">{fmtLakh(cash)}</p>
        <p className="mt-2 text-sm font-semibold text-red-800">Do not proceed — cash shortfall of {fmtLakh(Math.abs(cash))}</p>
      </article>
    );
  }
  if (cash < buffer) {
    return (
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-amber-900">Projected cash after</p>
        <p className="mt-1 font-serif text-4xl text-amber-800">{fmtLakh(cash)}</p>
        <p className="mt-2 text-sm font-semibold text-amber-900">Caution — below buffer</p>
      </article>
    );
  }
  return (
    <article className="rounded-2xl border border-gold/40 bg-white p-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">Projected cash after</p>
      <p className="mt-1 font-serif text-4xl text-gold">{fmtLakh(cash)}</p>
      <p className="mt-2 text-sm font-semibold text-emerald-700">{fmtLakh(cash - buffer)} above your desired buffer</p>
      <p className="mt-1 text-sm font-semibold text-emerald-800">Proceed — sufficient liquidity</p>
    </article>
  );
}

function Scenario({
  title,
  note,
  amount,
  cash,
  buffer,
  highlight,
}: {
  title: string;
  note: string;
  amount: number;
  cash: number;
  buffer: number;
  highlight?: boolean;
}) {
  const mark = cash < 0 ? "Shortfall" : cash < buffer ? "Below buffer" : "Inside buffer";
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-card ${highlight ? "border-gold ring-2 ring-gold" : "border-navy/10"}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{title}</p>
      <p className="mt-1 text-xs text-navy/50">{note}</p>
      <p className="mt-3 text-sm">Investment <b className="tabular-nums">{fmtLakh(amount)}</b></p>
      <p className="text-sm">Cash after <b className="tabular-nums">{fmtLakh(cash)}</b></p>
      <p className="mt-2 text-sm font-semibold">{mark}</p>
    </article>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="mt-1 w-full rounded-xl border border-navy/15 px-3 py-2 text-sm font-normal"
      />
    </label>
  );
}

function Memo({
  invest,
  payments,
  collections,
  buffer,
  result,
  conservative,
  aggressive,
  after,
  recommendation,
  onClose,
}: {
  invest: number;
  payments: number;
  collections: number;
  buffer: number;
  result: number;
  conservative: number;
  aggressive: number;
  after: (amount: number) => number;
  recommendation: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/60 p-4">
      <article className="mt-8 w-full max-w-2xl rounded-2xl bg-ivory p-6 text-navy shadow-card">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Decision memo · 20 Oct 2026</p>
        <h3 className="mt-2 font-serif text-3xl">Expansion investment</h3>
        <p className="mt-3 text-sm leading-relaxed">
          Available cash {fmtLakh(available)}. Proposed investment {fmtLakh(invest)}. Payments due {fmtLakh(payments)}. Collections expected {fmtLakh(collections)}. Minimum buffer {fmtLakh(buffer)}. Projected cash after the base case is {fmtLakh(result)}.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>Conservative: invest {fmtLakh(conservative)}, cash after {fmtLakh(after(conservative))}.</li>
          <li>Base: invest {fmtLakh(invest)}, cash after {fmtLakh(result)}.</li>
          <li>Aggressive: invest {fmtLakh(aggressive)}, cash after {fmtLakh(after(aggressive))}.</li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed">{recommendation}</p>
        <p className="mt-4 text-xs text-navy/50">Illustrative demo data. Not a commitment to invest.</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Print</button>
          <button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Close</button>
        </div>
      </article>
    </div>
  );
}
