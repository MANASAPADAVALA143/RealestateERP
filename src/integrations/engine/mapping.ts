import { normalizeHeader } from "./parse.ts";
import type { ColumnProfile, FieldMapping, FieldType, ImportCategory, MappingSuggestion, MappingTemplate, TargetField } from "./types.ts";

export const CONFIDENT = 0.85;

function tokens(text: string): Set<string> {
  return new Set(normalizeHeader(text).split(" ").filter((token) => token.length > 0 && !["the", "of", "and", "amt"].includes(token)));
}

function similarity(header: string, candidate: string): number {
  const a = normalizeHeader(header);
  const b = normalizeHeader(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.replace(/ /g, "") === b.replace(/ /g, "")) return 0.97;
  const ta = tokens(a);
  const tb = tokens(b);
  const shared = [...ta].filter((token) => tb.has(token)).length;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = union === 0 ? 0 : shared / union;
  if (jaccard >= 0.99) return 0.95;
  if (jaccard > 0) return 0.45 + jaccard * 0.4;
  if (a.includes(b) || b.includes(a)) return 0.5;
  return 0;
}

export function fieldScore(header: string, field: TargetField, aliases: string[] = []): number {
  const candidates = [field.label, field.key.replace(/_/g, " "), ...field.synonyms];
  let best = 0;
  for (const alias of aliases) best = Math.max(best, normalizeHeader(alias) === normalizeHeader(header) ? 1 : 0);
  for (const candidate of candidates) best = Math.max(best, similarity(header, candidate) * (candidate === field.synonyms[0] ? 1 : 0.99));
  return Math.round(best * 100) / 100;
}

export function suggestMapping(
  category: ImportCategory,
  headers: string[],
  aliases: Record<string, string[]> = {},
): MappingSuggestion[] {
  const pairs: { column: number; target: string; score: number }[] = [];
  headers.forEach((header, column) => {
    for (const field of category.fields) {
      const score = fieldScore(header, field, aliases[field.key]);
      if (score >= 0.55) pairs.push({ column, target: field.key, score });
    }
  });
  pairs.sort((x, y) => y.score - x.score || x.column - y.column);
  const usedColumns = new Set<number>();
  const usedTargets = new Set<string>();
  const result: MappingSuggestion[] = headers.map((_, column) => ({ column, target: null, confidence: 0 }));
  for (const pair of pairs) {
    if (usedColumns.has(pair.column) || usedTargets.has(pair.target)) continue;
    usedColumns.add(pair.column);
    usedTargets.add(pair.target);
    result[pair.column] = { column: pair.column, target: pair.target, confidence: pair.score };
  }
  return result;
}

export function mappingFromSuggestions(category: ImportCategory, suggestions: MappingSuggestion[]): FieldMapping {
  const mapping: FieldMapping = {};
  for (const field of category.fields) mapping[field.key] = null;
  for (const suggestion of suggestions) if (suggestion.target) mapping[suggestion.target] = suggestion.column;
  return mapping;
}

export function mappingFromTemplate(category: ImportCategory, template: MappingTemplate, headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  const index = new Map(headers.map((header, column) => [normalizeHeader(header), column]));
  for (const field of category.fields) {
    const header = template.mapping[field.key];
    mapping[field.key] = header !== undefined ? index.get(normalizeHeader(header)) ?? null : null;
  }
  return mapping;
}

export function mappingToHeaders(mapping: FieldMapping, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, column] of Object.entries(mapping)) if (column !== null && headers[column] !== undefined) out[key] = headers[column];
  return out;
}

export function templateMatchScore(template: MappingTemplate, headers: string[]): number {
  const set = new Set(headers.map(normalizeHeader));
  const mapped = Object.values(template.mapping);
  if (mapped.length === 0) return 0;
  return mapped.filter((header) => set.has(normalizeHeader(header))).length / mapped.length;
}

export interface MappingCheck {
  missingRequired: TargetField[];
  duplicateColumns: { column: number; targets: string[] }[];
  unmappedColumns: number[];
  typeWarnings: { field: TargetField; column: number; detected: FieldType }[];
}

function compatible(expected: FieldType, detected: FieldType): boolean {
  if (expected === detected) return true;
  if (expected === "string" || expected === "enum") return true;
  if (expected === "period") return detected === "date" || detected === "number" || detected === "string";
  if (expected === "number") return detected === "number";
  if (expected === "date") return detected === "date";
  return false;
}

export function checkMapping(category: ImportCategory, mapping: FieldMapping, profiles: ColumnProfile[]): MappingCheck {
  const missingRequired = category.fields.filter((field) => field.required && (mapping[field.key] === null || mapping[field.key] === undefined));
  const byColumn = new Map<number, string[]>();
  for (const [key, column] of Object.entries(mapping)) {
    if (column === null || column === undefined) continue;
    byColumn.set(column, [...(byColumn.get(column) ?? []), key]);
  }
  const duplicateColumns = [...byColumn.entries()].filter(([, targets]) => targets.length > 1).map(([column, targets]) => ({ column, targets }));
  const mappedColumns = new Set(byColumn.keys());
  const unmappedColumns = profiles.filter((profile) => !mappedColumns.has(profile.index) && profile.emptyCount < Number.MAX_SAFE_INTEGER).map((profile) => profile.index);
  const typeWarnings: MappingCheck["typeWarnings"] = [];
  for (const field of category.fields) {
    const column = mapping[field.key];
    if (column === null || column === undefined) continue;
    const profile = profiles[column];
    if (profile && profile.sample.length > 0 && !compatible(field.type, profile.detected)) typeWarnings.push({ field, column, detected: profile.detected });
  }
  return { missingRequired, duplicateColumns, unmappedColumns, typeWarnings };
}
