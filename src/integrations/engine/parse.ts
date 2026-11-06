import * as XLSX from "xlsx";
import type { CellValue, ColumnProfile, DateOrder, FieldType, ImportCategory, ParsedSheet, ParsedWorkbook } from "./types.ts";

export class FileFormatError extends Error {}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function fileKind(fileName: string): "xlsx" | "xls" | "csv" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function parseWorkbook(fileName: string, data: ArrayBuffer): ParsedWorkbook {
  const kind = fileKind(fileName);
  if (!kind) throw new FileFormatError(`${fileName} is not a supported file. Use .xlsx, .xls, or .csv.`);
  const bytes = new Uint8Array(data);
  if (bytes.length === 0) throw new FileFormatError(`${fileName} is empty.`);
  if (kind === "xlsx" && !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    throw new FileFormatError(`${fileName} is not a valid .xlsx workbook. The file may be corrupted or renamed.`);
  }
  if (kind === "xls" && !startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0]) && !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    throw new FileFormatError(`${fileName} is not a valid .xls workbook. The file may be corrupted or renamed.`);
  }

  let workbook: XLSX.WorkBook;
  try {
    if (kind === "csv") {
      const text = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
      workbook = XLSX.read(text, { type: "string", raw: true });
    } else {
      workbook = XLSX.read(bytes, { type: "array", cellNF: true, cellDates: false });
    }
  } catch (error) {
    throw new FileFormatError(`${fileName} could not be read: ${error instanceof Error ? error.message : "unknown parser error"}.`);
  }

  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => ({ name, rows: sheetRows(workbook.Sheets[name]) }));
  if (sheets.every((sheet) => sheet.rows.length === 0)) throw new FileFormatError(`${fileName} has no data in any worksheet.`);
  return { fileName, sheets };
}

function sheetRows(sheet: XLSX.WorkSheet | undefined): CellValue[][] {
  if (!sheet || !sheet["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const rows: CellValue[][] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: CellValue[] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      row.push(cellValue(cell));
    }
    rows.push(row);
  }
  while (rows.length > 0 && rows[rows.length - 1].every(isEmpty)) rows.pop();
  return rows;
}

function cellValue(cell: XLSX.CellObject | undefined): CellValue {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  if (cell.t === "e") return null;
  if (cell.t === "b") return Boolean(cell.v);
  if (cell.t === "d" && cell.v instanceof Date) return cell.v;
  if (cell.t === "n") {
    const format = typeof cell.z === "string" ? cell.z : "";
    if (format && XLSX.SSF.is_date(format)) {
      const parts = XLSX.SSF.parse_date_code(Number(cell.v));
      if (parts) return new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
    }
    return Number(cell.v);
  }
  const text = String(cell.v).trim();
  return text === "" ? null : text;
}

export function isEmpty(value: CellValue): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[%#]/g, (char) => (char === "%" ? " pct " : " no "))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function detectHeaderRow(rows: CellValue[][], category: ImportCategory, scan = 30): number {
  const vocabulary = new Set<string>();
  for (const field of category.fields) {
    vocabulary.add(normalizeHeader(field.label));
    vocabulary.add(normalizeHeader(field.key.replace(/_/g, " ")));
    field.synonyms.forEach((synonym) => vocabulary.add(normalizeHeader(synonym)));
  }
  let best = 0;
  let bestScore = -Infinity;
  for (let index = 0; index < Math.min(rows.length, scan); index += 1) {
    const row = rows[index];
    const filled = row.filter((cell) => !isEmpty(cell));
    if (filled.length < 2) continue;
    const strings = filled.filter((cell) => typeof cell === "string" && parseNumber(cell) === null);
    const numbers = filled.length - strings.length;
    const hits = strings.filter((cell) => vocabulary.has(normalizeHeader(String(cell)))).length;
    const unique = new Set(strings.map((cell) => normalizeHeader(String(cell)))).size;
    const score = hits * 5 + unique - numbers * 3;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

export function headersFor(rows: CellValue[][], headerRow: number): string[] {
  const row = rows[headerRow] ?? [];
  const seen = new Map<string, number>();
  return row.map((cell, index) => {
    const base = isEmpty(cell) ? `Column ${index + 1}` : cellText(cell);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base} (${count})` : base;
  });
}

export function dataRows(rows: CellValue[][], headerRow: number): { row: number; cells: CellValue[] }[] {
  const out: { row: number; cells: CellValue[] }[] = [];
  for (let index = headerRow + 1; index < rows.length; index += 1) {
    if (rows[index].every(isEmpty)) continue;
    out.push({ row: index + 1, cells: rows[index] });
  }
  return out;
}

export function cellText(value: CellValue): string {
  if (value === null) return "";
  if (value instanceof Date) return isoDate(value);
  return String(value);
}

export function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function parseNumber(value: CellValue): number | null {
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value instanceof Date) return null;
  let text = value.trim();
  if (text === "" || text === "-" || text === "—") return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/-$/.test(text)) {
    negative = true;
    text = text.slice(0, -1);
  }
  text = text.replace(/^(usd|aed|inr|eur|gbp)\s*/i, "").replace(/[$€£₹\s]/g, "").replace(/%$/, "");
  if (/^-/.test(text)) {
    negative = !negative;
    text = text.slice(1);
  }
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(text)) text = text.replace(/\./g, "").replace(",", ".");
  else text = text.replace(/,/g, "");
  if (!/^\d*\.?\d+(e[+-]?\d+)?$/i.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

const slashDate = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{2,4})$/;
const textDate = /^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-,]+(\d{2,4})$|^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/;

function fullYear(value: number): number {
  if (value >= 100) return value;
  return value >= 70 ? 1900 + value : 2000 + value;
}

function validDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function monthIndex(text: string): number {
  return MONTHS.indexOf(text.slice(0, 3).toLowerCase()) + 1;
}

export function parseDate(value: CellValue, order: DateOrder = "auto"): { iso: string | null; ambiguous: boolean } {
  if (value === null) return { iso: null, ambiguous: false };
  if (value instanceof Date) return { iso: isoDate(value), ambiguous: false };
  if (typeof value === "number") {
    if (value > 20000 && value < 80000) {
      const parts = XLSX.SSF.parse_date_code(value);
      if (parts) return { iso: isoDate(new Date(Date.UTC(parts.y, parts.m - 1, parts.d))), ambiguous: false };
    }
    return { iso: null, ambiguous: false };
  }
  if (typeof value !== "string") return { iso: null, ambiguous: false };
  const text = value.trim().replace(/T.*$/, "");
  const slash = text.match(slashDate);
  if (slash) {
    const [a, b, c] = [Number(slash[1]), Number(slash[2]), Number(slash[3])];
    if (slash[1].length === 4) {
      const date = validDate(a, b, c);
      return { iso: date ? isoDate(date) : null, ambiguous: false };
    }
    const year = fullYear(c);
    let resolved: "MDY" | "DMY";
    let ambiguous = false;
    if (order === "MDY" || order === "DMY") resolved = order;
    else if (a > 12) resolved = "DMY";
    else if (b > 12) resolved = "MDY";
    else {
      resolved = "MDY";
      ambiguous = a !== b;
    }
    const date = resolved === "MDY" ? validDate(year, a, b) : validDate(year, b, a);
    return { iso: date ? isoDate(date) : null, ambiguous: ambiguous && order === "auto" };
  }
  const words = text.match(textDate);
  if (words) {
    const day = Number(words[1] ?? words[5]);
    const month = monthIndex(words[2] ?? words[4]);
    const year = fullYear(Number(words[3] ?? words[6]));
    const date = month ? validDate(year, month, day) : null;
    return { iso: date ? isoDate(date) : null, ambiguous: false };
  }
  return { iso: null, ambiguous: false };
}

export function parsePeriod(value: CellValue): string | null {
  if (value === null) return null;
  if (value instanceof Date) return isoDate(value).slice(0, 7);
  const text = String(value).trim();
  let match = text.match(/^(\d{4})[-/](\d{1,2})$/);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) return `${match[1]}-${match[2].padStart(2, "0")}`;
  match = text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match && Number(match[1]) >= 1 && Number(match[1]) <= 12) return `${match[2]}-${match[1].padStart(2, "0")}`;
  match = text.match(/^(\d{4})(\d{2})$/);
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) return `${match[1]}-${match[2]}`;
  match = text.match(/^([A-Za-z]{3,9})[\s-]+(\d{4})$/);
  if (match && monthIndex(match[1])) return `${match[2]}-${String(monthIndex(match[1])).padStart(2, "0")}`;
  match = text.match(/^(?:FY\s?)?(\d{4})$/i);
  if (match) return match[1];
  match = text.match(/^Q([1-4])[\s-]*(\d{4})$/i) ?? text.match(/^(\d{4})[\s-]*Q([1-4])$/i);
  if (match) return /^Q/i.test(text) ? `${match[2]}-Q${match[1]}` : `${match[1]}-Q${match[2]}`;
  const date = parseDate(text, "auto");
  return date.iso ? date.iso.slice(0, 7) : null;
}

export function profileColumns(headers: string[], rows: { cells: CellValue[] }[], sampleSize = 200): ColumnProfile[] {
  return headers.map((header, index) => {
    const values = rows.slice(0, sampleSize).map((row) => row.cells[index] ?? null);
    const filled = values.filter((value) => !isEmpty(value));
    const emptyCount = values.length - filled.length;
    let detected: FieldType = "string";
    let dateOrder: ColumnProfile["dateOrder"];
    if (filled.length > 0) {
      const share = (test: (value: CellValue) => boolean) => filled.filter(test).length / filled.length;
      const dateShare = share((value) => value instanceof Date || (typeof value === "string" && parseDate(value, "auto").iso !== null));
      const numberShare = share((value) => parseNumber(value) !== null);
      const periodShare = share((value) => typeof value === "string" && /^(FY\s?)?\d{4}([-/]\d{1,2}|[-\s]?Q[1-4])?$|^[A-Za-z]{3,9}[\s-]+\d{4}$|^Q[1-4][\s-]*\d{4}$/i.test(value.trim()));
      if (dateShare >= 0.9) {
        detected = "date";
        dateOrder = detectDateOrder(filled);
      } else if (periodShare >= 0.9) detected = "period";
      else if (numberShare >= 0.9) detected = "number";
    }
    return { index, header, detected, dateOrder, sample: filled.slice(0, 5).map(cellText), emptyCount };
  });
}

export function detectDateOrder(values: CellValue[]): "MDY" | "DMY" | "YMD" | "ambiguous" {
  let mdy = false;
  let dmy = false;
  let ymd = false;
  for (const value of values) {
    if (value instanceof Date || typeof value !== "string") {
      ymd = true;
      continue;
    }
    const match = value.trim().match(slashDate);
    if (!match) {
      ymd = true;
      continue;
    }
    if (match[1].length === 4) ymd = true;
    else if (Number(match[1]) > 12) dmy = true;
    else if (Number(match[2]) > 12) mdy = true;
  }
  if (mdy && !dmy) return "MDY";
  if (dmy && !mdy) return "DMY";
  if (!mdy && !dmy && ymd) return "YMD";
  return "ambiguous";
}
