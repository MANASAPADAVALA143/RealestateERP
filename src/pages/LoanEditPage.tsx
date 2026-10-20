import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resolveLoan, saveLoanFile, type LoanFile } from "@/lib/loanFile";

const categories = ["Mortgage", "Term Loan", "Working Capital", "OD Facility", "Machinery Loan"];
const directions = ["Borrowed", "Lent"] as const;
const statuses = ["Active", "Closed", "Watch", "At Risk"];
const frequencies = ["Monthly", "Quarterly", "Bullet"] as const;

export function LoanEditPage() {
  const { loanId = "" } = useParams();
  const navigate = useNavigate();
  const existing = resolveLoan(loanId);
  const [file, setFile] = useState<LoanFile | undefined>(existing);
  const [error, setError] = useState("");
  if (!file) return <p className="text-sm text-navy/70">That loan is not on this register.</p>;

  function set<K extends keyof LoanFile>(key: K, value: LoanFile[K]) {
    setFile((current) => (current ? { ...current, [key]: value } : current));
  }

  function save() {
    if (!file || !file.sanctioned) {
      setError("Principal amount is required.");
      return;
    }
    saveLoanFile(file);
    navigate(`/loans/${file.id}`);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-navy/45">Edit loan</p>
        <h2 className="font-serif text-3xl text-navy">{file.name}</h2>
      </div>

      <Section title="Loan details">
        <div className="grid gap-4 md:grid-cols-2">
          <Label text="Loan / note name">
            <input className={input} value={file.name} onChange={(event) => set("name", event.target.value)} />
          </Label>
          <Label text="Category">
            <select className={input} value={file.category} onChange={(event) => set("category", event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Label>
          <Label text="Direction">
            <select className={input} value={file.direction} onChange={(event) => set("direction", event.target.value as LoanFile["direction"])}>
              {directions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Label>
          <Label text="Status">
            <select className={input} value={file.status} onChange={(event) => set("status", event.target.value)}>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Label>
          <Label text="Building / property">
            <input className={input} value={file.building} onChange={(event) => set("building", event.target.value)} />
          </Label>
          <Label text="Loan account number">
            <input className={input} value={file.account} onChange={(event) => set("account", event.target.value)} />
          </Label>
        </div>
      </Section>

      <Section title="Lender">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Label text="Lender name"><input className={input} value={file.lender} onChange={(event) => set("lender", event.target.value)} /></Label>
          <Label text="Contact person"><input className={input} value={file.contact} onChange={(event) => set("contact", event.target.value)} /></Label>
          <Label text="Lender email"><input className={input} value={file.email} onChange={(event) => set("email", event.target.value)} /></Label>
          <Label text="Lender phone"><input className={input} value={file.phone} onChange={(event) => set("phone", event.target.value)} /></Label>
        </div>
      </Section>

      <Section title="Payment schedule">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Label text="Loan start date"><input type="date" className={input} value={file.start} onChange={(event) => set("start", event.target.value)} /></Label>
          <Label text="Maturity date"><input type="date" className={input} value={isoDate(file.maturity)} onChange={(event) => set("maturity", event.target.value)} /></Label>
          <Label text="Payment frequency">
            <select className={input} value={file.frequency} onChange={(event) => set("frequency", event.target.value as LoanFile["frequency"])}>
              {frequencies.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Label>
          <Label text="Payment amount ₹ Cr"><input type="number" step="0.01" className={input} value={file.emi} onChange={(event) => set("emi", Number(event.target.value))} /></Label>
          <Label text="EMI date"><input type="date" className={input} value={file.emiDate} onChange={(event) => set("emiDate", event.target.value)} /></Label>
          <Label text="Loan term"><input className={input} value={file.termLabel} onChange={(event) => set("termLabel", event.target.value)} /></Label>
          <Label text="Prepayment terms"><input className={input} value={file.prepay} onChange={(event) => set("prepay", event.target.value)} /></Label>
        </div>
      </Section>

      <Section title="Amounts & interest">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Label text="Principal amount ₹ Cr *">
            <input required type="number" step="0.01" className={input} value={file.sanctioned} onChange={(event) => set("sanctioned", Number(event.target.value))} />
          </Label>
          <Label text="Outstanding balance ₹ Cr"><input type="number" step="0.01" className={input} value={file.outstanding} onChange={(event) => set("outstanding", Number(event.target.value))} /></Label>
          <Label text="Interest rate (% annual)"><input type="number" step="0.01" className={input} value={file.rate} onChange={(event) => set("rate", Number(event.target.value))} /></Label>
          <Label text="Outstanding interest ₹ Cr"><input type="number" step="0.01" className={input} value={file.outstandingInterest} onChange={(event) => set("outstandingInterest", Number(event.target.value))} /></Label>
          <Label text="Down payment / equity ₹ Cr"><input type="number" step="0.01" className={input} value={file.downPayment} onChange={(event) => set("downPayment", Number(event.target.value))} /></Label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={file.compound} onChange={(event) => set("compound", event.target.checked)} />
          Add unpaid interest to principal at year-end (compounds annually)
        </label>
      </Section>

      <Section title="Property & valuation">
        <div className="grid gap-4 md:grid-cols-3">
          <Label text="Property value ₹ Cr"><input type="number" step="0.01" className={input} value={file.propertyValue} onChange={(event) => set("propertyValue", Number(event.target.value))} /></Label>
          <Label text="Annual NOI ₹ Cr"><input type="number" step="0.01" className={input} value={file.noi} onChange={(event) => set("noi", Number(event.target.value))} /></Label>
          <Label text="Current market value ₹ Cr"><input type="number" step="0.01" className={input} value={file.market} onChange={(event) => set("market", Number(event.target.value))} /></Label>
        </div>
      </Section>

      <Section title="Documents & notes">
        <p className="text-xs uppercase tracking-[0.14em] text-navy/45">Supporting documents</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className={input}>
            <option>Loan Agreement</option>
            <option>Sanction Letter</option>
            <option>Promissory note</option>
            <option>Amortisation schedule</option>
          </select>
          <button type="button" className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">+ Add files</button>
        </div>
        <p className="mt-2 text-xs text-navy/50">Any file type – up to 25 MB each</p>
        <p className="mb-2 mt-4 text-xs uppercase tracking-[0.14em] text-navy/45">Notes & comments</p>
        <NoteEditor value={file.notes} onChange={(value) => set("notes", value)} />
      </Section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex items-center justify-between gap-3 border-t border-navy/10 pt-4">
        <p className="text-xs text-navy/50">* required</p>
        <div className="flex gap-2">
          <Link to={`/loans/${file.id}`} className="rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-inset ring-navy/15">Cancel</Link>
          <button type="submit" className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Save changes</button>
        </div>
      </div>
    </form>
  );
}

const input = "mt-1 w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
      <h3 className="mb-4 font-serif text-xl text-navy">{title}</h3>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
      {text}
      {children}
    </label>
  );
}

function NoteEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);
  function command(name: string, arg?: string) {
    document.execCommand(name, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  return (
    <div className="overflow-hidden rounded-xl border border-navy/15">
      <div className="flex flex-wrap gap-1 border-b border-navy/10 bg-ivory px-2 py-1">
        <Tool label="B" onClick={() => command("bold")} />
        <Tool label="I" onClick={() => command("italic")} />
        <Tool label="U" onClick={() => command("underline")} />
        <Tool label="H1" onClick={() => command("formatBlock", "H1")} />
        <Tool label="H2" onClick={() => command("formatBlock", "H2")} />
        <Tool label="Left" onClick={() => command("justifyLeft")} />
        <Tool label="Center" onClick={() => command("justifyCenter")} />
        <Tool label="Right" onClick={() => command("justifyRight")} />
        <Tool label="Bullet" onClick={() => command("insertUnorderedList")} />
        <Tool label="Number" onClick={() => command("insertOrderedList")} />
        <Tool label="Link" onClick={() => command("createLink", "https://")} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-28 px-3 py-2 text-sm empty:before:text-navy/40 empty:before:content-[attr(data-placeholder)]"
        data-placeholder="Terms, collateral, context..."
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

function Tool({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="rounded px-2 py-1 text-xs font-semibold text-navy hover:bg-white">
      {label}
    </button>
  );
}

function isoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "2031-03-31";
  return parsed.toISOString().slice(0, 10);
}
