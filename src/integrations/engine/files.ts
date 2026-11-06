import * as XLSX from "xlsx";
import type { ImportCategory, NormalizedRow, StoredRecord } from "./types.ts";

export function templateWorkbook(category: ImportCategory): ArrayBuffer {
  const headers = category.fields.map((field) => field.synonyms[0] ?? field.label);
  const rows = category.sampleRows.map((row) => headers.map((header) => row[header] ?? ""));
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const notes = XLSX.utils.aoa_to_sheet([
    ["EstateCFO field", "Column in this template", "Type", "Required", "Other accepted column names"],
    ...category.fields.map((field) => [field.key, field.synonyms[0] ?? field.label, field.type + (field.options ? ` (${field.options.join(" / ")})` : ""), field.required ? "Yes" : "No", field.synonyms.slice(1).join(", ")]),
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, category.label.slice(0, 31));
  XLSX.utils.book_append_sheet(book, notes, "Field guide");
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function errorReportCsv(rows: { row: number; issues: NormalizedRow["issues"]; status: string }[]): string {
  const lines: (string | number)[][] = [["Source row", "Row status", "Severity", "Rule", "Field", "Column", "Value", "Message"]];
  for (const row of rows) {
    for (const issue of row.issues) lines.push([row.row, row.status, issue.severity, issue.rule, issue.field ?? "", issue.column ?? "", issue.value ?? "", issue.message]);
  }
  return toCsv(lines);
}

export function recordsCsv(records: StoredRecord[], fields: string[]): string {
  return toCsv([
    ["source_system", "source_record_id", "import_job_id", "entity_id", "property_id", "period", ...fields],
    ...records.map((record) => [record.sourceSystem, record.sourceRecordId, record.jobId, record.entityId ?? "", record.propertyId ?? "", record.period ?? "", ...fields.map((field) => record.values[field] ?? "")]),
  ]);
}

export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? "" : String(cell);
          const safe = /^[=+\-@]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
          return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(","),
    )
    .join("\r\n");
}
