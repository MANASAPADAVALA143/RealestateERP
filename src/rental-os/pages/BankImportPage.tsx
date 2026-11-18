/**
 * Rental OS — Bank Statement Import
 *
 * Upload CSV or Excel bank statements. Configurable column mapping.
 * Duplicate detection against existing payment bankLineRefs.
 * Staged transactions stored in localStorage per workspace and fed
 * into the Reconciliation workspace.
 *
 * STATUS: Production — parses real files, writes staged lines to localStorage.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { ArrowRight, Upload, AlertTriangle } from "lucide-react";
import { useArBook } from "@/ar/ui/hooks";

export interface StagedLine {
  key: string;
  date: string;
  valueDate?: string;
  description: string;
  reference: string;
  amount: number;
  currency: string;
  balance?: number;
  bankAccount: string;
  duplicate: boolean;
}

export const STAGED_KEY = (workspaceId: string) => `ros:bank_staged:${workspaceId}`;

function parseDate(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return "";
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const str = String(raw).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return str.slice(0, 10);
}

function cellText(row: Record<string, unknown>, col: string): string {
  const v = row[col];
  return v !== null && v !== undefined ? String(v).trim() : "";
}

function cellNum(row: Record<string, unknown>, col: string): number {
  const v = row[col];
  if (typeof v === "number") return v;
  const parsed = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

const DEFAULT_MAP = { date: "", valueDate: "", description: "", reference: "", credit: "", debit: "", currency: "", balance: "" };

const inputClass = "block w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-sm focus:border-[#C79A2B] focus:outline-none focus:ring-1 focus:ring-[#C79A2B]";

export function BankImportPage() {
  const { book, workspaceId } = useArBook();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bankAccount, setBankAccount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [colMap, setColMap] = useState({ ...DEFAULT_MAP });
  const [preview, setPreview] = useState<StagedLine[]>([]);
  const [error, setError] = useState("");
  const [staged, setStaged] = useState(0);

  if (!book || !workspaceId) return null;

  const existingRefs = new Set(book.payments.filter((p) => p.bankLineRef).map((p) => p.bankLineRef!));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target!.result as ArrayBuffer;
        const bytes = new Uint8Array(data);
        let wb: XLSX.WorkBook;
        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
          wb = XLSX.read(text, { type: "string", raw: true });
        } else {
          wb = XLSX.read(bytes, { type: "array", cellDates: false });
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (jsonRows.length === 0) { setError("File is empty or has no data rows."); return; }
        const h = Object.keys(jsonRows[0]);
        setHeaders(h);
        setRows(jsonRows.slice(0, 500));
        // Auto-detect columns
        const auto = { ...DEFAULT_MAP };
        for (const col of h) {
          const lc = col.toLowerCase();
          if (!auto.date && /\bdate\b/.test(lc) && !/value/.test(lc)) auto.date = col;
          if (!auto.valueDate && /value.?date|val.?dt/.test(lc)) auto.valueDate = col;
          if (!auto.description && /desc|narr|particular|detail|remark/.test(lc)) auto.description = col;
          if (!auto.reference && /ref|txn.?id|utr|chq|cheque|trans.?id/.test(lc)) auto.reference = col;
          if (!auto.credit && /credit|cr\b|deposit/.test(lc)) auto.credit = col;
          if (!auto.debit && /debit|dr\b|withdrawal/.test(lc)) auto.debit = col;
          if (!auto.currency && /curr/.test(lc)) auto.currency = col;
          if (!auto.balance && /balance|bal\b|closing/.test(lc)) auto.balance = col;
        }
        setColMap(auto);
        setPreview([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not parse file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function buildPreview() {
    if (!colMap.date || (!colMap.credit && !colMap.debit)) {
      setError("Map at least Date and Credit (or Debit) columns.");
      return;
    }
    setError("");
    const lines: StagedLine[] = [];
    rows.forEach((row, idx) => {
      const date = parseDate(colMap.date ? row[colMap.date] : "");
      if (!date) return;
      const credit = colMap.credit ? cellNum(row, colMap.credit) : 0;
      const debit = colMap.debit ? cellNum(row, colMap.debit) : 0;
      const amount = credit > 0 ? credit : -debit;
      if (amount <= 0) return; // only inflows
      const desc = colMap.description ? cellText(row, colMap.description) : "";
      const ref = colMap.reference ? cellText(row, colMap.reference) : "";
      const bal = colMap.balance ? cellNum(row, colMap.balance) : undefined;
      const key = `${date}|${amount}|${desc.slice(0, 20)}|${idx}`;
      const duplicate = existingRefs.has(key);
      lines.push({ key, date, description: desc, reference: ref, amount, currency: colMap.currency ? cellText(row, colMap.currency) || currency : currency, balance: bal, bankAccount: bankAccount || book!.settings.bankAccounts[0]?.name, duplicate });
    });
    setPreview(lines);
  }

  function stageAll() {
    const toStage = preview.filter((l) => !l.duplicate);
    try {
      localStorage.setItem(STAGED_KEY(workspaceId!), JSON.stringify(toStage));
      setStaged(toStage.length);
    } catch {
      setError("Could not save staged lines. LocalStorage may be full.");
    }
  }

  const duplicates = preview.filter((l) => l.duplicate).length;
  const fresh = preview.filter((l) => !l.duplicate).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Bank Statement Import</h1>
        <p className="mt-1 text-sm text-navy/60">Upload CSV or Excel. Map columns, detect duplicates, stage for reconciliation.</p>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{error}</div>}

      {/* Upload */}
      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <h2 className="font-serif text-lg text-navy mb-4">1. Upload File</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Bank Account</label>
            <select className={inputClass} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
              {book.settings.bankAccounts.map((b) => <option key={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Default Currency</label>
            <input className={inputClass} value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="INR" />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/85"
            >
              <Upload className="h-4 w-4" /> Choose File (.csv, .xlsx, .xls)
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
          </div>
        </div>
        {headers.length > 0 && <p className="mt-3 text-xs text-emerald-600 font-medium">✓ {rows.length} rows loaded from file. Map columns below.</p>}
      </div>

      {/* Column mapping */}
      {headers.length > 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-navy mb-4">2. Map Columns</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["date", "valueDate", "description", "reference", "credit", "debit", "currency", "balance"] as const).map((field) => (
              <div key={field}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">
                  {field === "credit" ? "Credit / Deposit" : field === "debit" ? "Debit / Withdrawal" : field === "valueDate" ? "Value Date (opt)" : field === "balance" ? "Balance (opt)" : field}
                  {field === "date" || field === "credit" ? " *" : ""}
                </label>
                <select className={inputClass} value={colMap[field]} onChange={(e) => setColMap({ ...colMap, [field]: e.target.value })}>
                  <option value="">— not mapped —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button type="button" onClick={buildPreview} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8891e]">
            Preview Transactions
          </button>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
            <div>
              <h2 className="font-serif text-xl text-navy">3. Review &amp; Stage</h2>
              <p className="text-xs text-navy/55 mt-0.5">{fresh} new · {duplicates} already matched (will be skipped)</p>
            </div>
            <div className="flex items-center gap-3">
              {staged > 0 && (
                <Link to="/rental-os/reconciliation" className="inline-flex items-center gap-1.5 rounded-xl border border-[#C79A2B]/40 bg-[#C79A2B]/5 px-3 py-2 text-xs font-semibold text-[#C79A2B] hover:bg-[#C79A2B]/10">
                  Reconcile {staged} lines <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={stageAll}
                disabled={fresh === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-40"
              >
                Stage {fresh} Line{fresh !== 1 ? "s" : ""} for Reconciliation
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Description</th><th>Reference</th><th className="text-right">Amount</th><th>Currency</th><th>Status</th></tr>
              </thead>
              <tbody>
                {preview.slice(0, 100).map((line) => (
                  <tr key={line.key} className={line.duplicate ? "opacity-50" : ""}>
                    <td>{line.date}</td>
                    <td className="max-w-xs truncate text-xs">{line.description || "—"}</td>
                    <td className="text-xs text-navy/60">{line.reference || "—"}</td>
                    <td className="text-right tabular-nums font-medium">₹{line.amount.toLocaleString("en-IN")}</td>
                    <td className="text-xs">{line.currency}</td>
                    <td>
                      {line.duplicate
                        ? <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Already matched</span>
                        : <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">New</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 100 && <p className="px-5 py-3 text-xs text-navy/50">Showing first 100 of {preview.length} rows.</p>}
        </div>
      )}
    </div>
  );
}
