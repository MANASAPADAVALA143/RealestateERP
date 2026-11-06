import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Database, UploadCloud } from "lucide-react";
import { Crumb } from "@/components/drill";
import { integrationService, useAsync } from "@/integrations/ui/hooks";
import type { ImportJob, Severity } from "@/integrations/engine/types";

export function IntegrationPage({ title, subtitle, actions, children, crumbs }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; crumbs?: { label: string; to?: string }[] }) {
  return (
    <div className="space-y-5">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Data Integrations", to: "/data-integrations" }, ...(crumbs ?? [{ label: title }])]} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-navy">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-navy/60">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function StorageNotice() {
  const label = integrationService.storage.label;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-navy/80">
      <Database className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
      <span>
        Storage: {label} Imported files and records persist across reloads on this browser only. Multi-user access needs the server database described in{" "}
        <Link to="/data-integrations/settings" className="font-semibold underline-offset-2 hover:underline">Integration Settings</Link>.
      </span>
    </p>
  );
}

const statusTone: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  Imported: "bg-sky-50 text-sky-800 ring-sky-700/20",
  "Imported - exceptions open": "bg-amber-50 text-amber-900 ring-amber-700/20",
  Failed: "bg-red-50 text-red-800 ring-red-700/20",
  Withdrawn: "bg-navy/5 text-navy/60 ring-navy/10",
  Reconciled: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  "Differences found": "bg-red-50 text-red-800 ring-red-700/20",
  "Exceptions reviewed — not reconciled": "bg-amber-50 text-amber-900 ring-amber-700/20",
  valid: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  imported: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  warning: "bg-amber-50 text-amber-900 ring-amber-700/20",
  error: "bg-red-50 text-red-800 ring-red-700/20",
  duplicate: "bg-violet-50 text-violet-800 ring-violet-700/20",
  matched: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  alias: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  new: "bg-sky-50 text-sky-800 ring-sky-700/20",
  possible: "bg-amber-50 text-amber-900 ring-amber-700/20",
  unmatched: "bg-red-50 text-red-800 ring-red-700/20",
};

export function Pill({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = statusTone[tone ?? String(children)] ?? "bg-navy/5 text-navy/70 ring-navy/10";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>{children}</span>;
}

export function SeverityPill({ severity }: { severity: Severity }) {
  return <Pill tone={severity === "error" ? "error" : "warning"}>{severity === "error" ? "Error" : "Warning"}</Pill>;
}

export function Stat({ label, value, hint, tone = "navy", to }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "navy" | "gold" | "red" | "green" | "amber"; to?: string }) {
  const bar = { navy: "border-t-navy", gold: "border-t-gold", red: "border-t-red-600", green: "border-t-emerald-600", amber: "border-t-amber-500" }[tone];
  const body = (
    <article className={`h-full rounded-2xl border border-navy/10 border-t-4 ${bar} bg-white p-4 shadow-card ${to ? "transition hover:-translate-y-0.5" : ""}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-navy/50">{label}</p>
      <p className="mt-2 font-serif text-2xl leading-tight text-navy">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-navy/60">{hint}</p> : null}
    </article>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function Section({ title, subtitle, actions, children, className = "" }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-navy/10 bg-white shadow-card ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy/5 px-5 py-4">
        <div>
          <h3 className="font-serif text-xl text-navy">{title}</h3>
          {subtitle ? <p className="mt-1 max-w-3xl text-sm text-navy/60">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Button({ children, onClick, primary, danger, disabled, type = "button", title }: { children: ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; type?: "button" | "submit"; title?: string }) {
  const style = primary ? "bg-navy text-ivory hover:bg-navy/90" : danger ? "bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50" : "bg-white text-navy ring-1 ring-inset ring-navy/15 hover:border-gold hover:ring-gold/60";
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${style}`}>
      {children}
    </button>
  );
}

export function Dropzone({ onFile, accept = ".xlsx,.xls,.csv", label = "Drop an Excel or CSV file here" }: { onFile: (file: File) => void; accept?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      data-dropzone
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${over ? "border-gold bg-gold/10" : "border-navy/20 bg-sky-50/50"}`}
    >
      <UploadCloud className="h-8 w-8 text-navy/50" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-navy">{label}</p>
      <p className="mt-1 text-xs text-navy/50">.xlsx, .xls, or .csv</p>
      <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">
        Select file
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        aria-label="Select file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-navy/15 bg-ivory/60 px-4 py-6 text-center text-sm text-navy/60">{children}</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{children}</p>;
}

export function Notice({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "sky" | "green" }) {
  const cls = { amber: "border-amber-300 bg-amber-50", sky: "border-sky-200 bg-sky-50", green: "border-emerald-200 bg-emerald-50" }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed text-navy ${cls}`}>{children}</div>;
}

export function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function useJobs(tenantId: string | undefined) {
  return useAsync(async () => (tenantId ? integrationService.jobs(tenantId) : ([] as ImportJob[])), [tenantId]);
}

export function TextArea({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder?: string; label: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 min-h-16 w-full rounded-xl border border-navy/15 px-3 py-2 text-sm normal-case tracking-normal text-navy" />
    </label>
  );
}

export const inputClass = "rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy";
