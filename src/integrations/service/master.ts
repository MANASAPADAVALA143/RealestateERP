import { properties } from "../../realestate/data.ts";
import type { MasterRecord } from "../engine/types.ts";

export const DEFAULT_TENANT = "meridian-ventures";

const codes: Record<string, string> = { meridian: "MER-1790", austin: "AUS-BLVD" };

export const baseProperties: (MasterRecord & { marketValue: number; entityId: string })[] = properties.map((property) => ({
  id: codes[property.id] ?? property.id.toUpperCase(),
  name: property.name,
  aliases: [],
  source: "EstateCFO",
  marketValue: property.market,
  entityId: "MHLP",
}));

export const baseEntities: MasterRecord[] = [
  { id: "RCP", name: "Ridgeline Capital Partners", aliases: [], source: "EstateCFO" },
  { id: "MHLP", name: "Meridian Holdings LP", aliases: [], source: "EstateCFO" },
  { id: "MCL", name: "Meridian Construction LLC", aliases: [], source: "EstateCFO" },
  { id: "BRL", name: "Bluestone Rentals LLC", aliases: [], source: "EstateCFO" },
  { id: "CCL", name: "Crestview Commercial LLC", aliases: [], source: "EstateCFO" },
  { id: "SLH", name: "Summit Land Holdings LLC", aliases: [], source: "EstateCFO" },
];
