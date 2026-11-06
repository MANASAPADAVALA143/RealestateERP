import { normalizeHeader } from "./parse.ts";
import type { MasterRecord, MatchResult } from "./types.ts";

export function normalizeId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export function normalizeName(value: string): string {
  return normalizeHeader(value).replace(/\b(llc|lp|inc|ltd|the|commercial lot)\b/g, "").replace(/\s+/g, " ").trim();
}

export interface MatchContext {
  master: MasterRecord[];
  confirmedNew: Set<string>;
}

export function matchRecord(kind: "property" | "entity", sourceId: string, sourceName: string | undefined, context: MatchContext, isMasterImport: boolean): MatchResult {
  const id = normalizeId(sourceId);
  const exact = context.master.find((record) => normalizeId(record.id) === id);
  if (exact) {
    return { kind, sourceId, sourceName, status: "matched", masterId: exact.id, masterName: exact.name, note: `Matched on ${kind} code ${exact.id}.` };
  }
  const alias = context.master.find((record) => record.aliases.some((item) => normalizeId(item) === id));
  if (alias) {
    return { kind, sourceId, sourceName, status: "alias", masterId: alias.id, masterName: alias.name, note: `Linked to ${alias.id} through a saved identifier.` };
  }
  if (sourceName) {
    const name = normalizeName(sourceName);
    const sameName = name ? context.master.find((record) => normalizeName(record.name) === name) : undefined;
    if (sameName && !context.confirmedNew.has(id)) {
      return {
        kind,
        sourceId,
        sourceName,
        status: "possible",
        masterId: sameName.id,
        masterName: sameName.name,
        note: `Same name as ${sameName.id} (${sameName.name}) but a different code. Link it or confirm it is a separate ${kind}.`,
      };
    }
  }
  if (isMasterImport) {
    return { kind, sourceId, sourceName, status: "new", note: `New ${kind}. It is added to the EstateCFO master when the import is published.` };
  }
  return { kind, sourceId, sourceName, status: "unmatched", note: `${kind === "property" ? "Property" : "Entity"} ${sourceId} is not in the EstateCFO master. Link it to an existing record or import it in the ${kind === "property" ? "Property" : "Entity"} Master first.` };
}
