import { useState, useEffect } from "react";
import { IndexedDbAdapter } from "../integrations/service/storage.ts";
import { getFinService } from "../fin/finService.ts";
import { OpsService } from "../ops/opsService.ts";

const WS = "meridian-ventures";

let _adapter: IndexedDbAdapter | null = null;
function db(): IndexedDbAdapter {
  if (!_adapter) _adapter = new IndexedDbAdapter();
  return _adapter;
}

export function finSvc() { return getFinService(db(), WS); }
export function opsSvc() { return new OpsService(db(), WS); }

// ── AR Aging ──────────────────────────────────────────────────────────────────
export interface AgingBucket { bucket: string; count: number; amount: number }

export function useArAging() {
  const [data, setData] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db().getAll("ar_invoices").then((invoices: any[]) => {
      const today = new Date();
      const buckets: Record<string, AgingBucket> = {
        "0-30":  { bucket: "0-30 days",  count: 0, amount: 0 },
        "31-60": { bucket: "31-60 days", count: 0, amount: 0 },
        "61-90": { bucket: "61-90 days", count: 0, amount: 0 },
        "90+":   { bucket: "90+ days",   count: 0, amount: 0 },
      };
      (invoices || [])
        .filter((inv) => inv.workspaceId === WS && inv.status === "Posted" && (inv.amountDue ?? inv.totalAmount) > 0)
        .forEach((inv) => {
          const due = new Date(inv.dueDate ?? inv.invoiceDate);
          const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
          const key = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
          buckets[key].count++;
          buckets[key].amount += inv.amountDue ?? inv.totalAmount ?? 0;
        });
      setData(Object.values(buckets));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ── Revenue vs Expense Trend ──────────────────────────────────────────────────
export interface MonthTrend { month: string; revenue: number; expenses: number; net: number }

export function useRevExpTrend() {
  const [data, setData] = useState<MonthTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const journals: any[] = await db().getAll("fin_journals");
        const map: Record<string, { revenue: number; expenses: number }> = {};
        (journals || [])
          .filter((j) => j.workspaceId === WS && j.status === "Posted")
          .forEach((j) => {
            const mo = (j.date ?? j.postingDate ?? "").slice(0, 7);
            if (!mo) return;
            if (!map[mo]) map[mo] = { revenue: 0, expenses: 0 };
            (j.lines ?? []).forEach((l: any) => {
              if (l.accountType === "Revenue") map[mo].revenue += l.credit ?? 0;
              if (l.accountType === "Expense") map[mo].expenses += l.debit ?? 0;
            });
          });
        const months = Object.keys(map).sort();
        setData(months.map((mo) => ({
          month: mo,
          revenue: map[mo].revenue,
          expenses: map[mo].expenses,
          net: map[mo].revenue - map[mo].expenses,
        })));
      } finally { setLoading(false); }
    })();
  }, []);

  return { data, loading };
}

// ── Occupancy ─────────────────────────────────────────────────────────────────
export interface OccupancyRow { unit: string; property: string; status: "Occupied" | "Vacant" | "Notice" }

export function useOccupancy() {
  const [data, setData] = useState<OccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const allLeases: any[] = (await db().getAll("ar_leases")) ?? [];
        const wsLeases = allLeases.filter((l) => l.workspaceId === WS);
        const today = new Date().toISOString().slice(0, 10);
        const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        const active = new Set(wsLeases.filter((l) => l.status === "Active" && l.endDate >= today).map((l) => l.unitId));
        const notice = new Set(wsLeases.filter((l) => l.status === "Active" && l.endDate >= today && l.endDate < soon).map((l) => l.unitId));
        const unitIds = [...new Set(wsLeases.map((l) => l.unitId).filter(Boolean))];
        const rows: OccupancyRow[] = unitIds.map((uid) => {
          const ls = wsLeases.filter((l) => l.unitId === uid);
          return {
            unit: ls[0]?.unitNumber ?? uid,
            property: ls[0]?.propertyName ?? ls[0]?.propertyId ?? "—",
            status: notice.has(uid) ? "Notice" : active.has(uid) ? "Occupied" : "Vacant",
          };
        });
        setData(rows);
        setRate(rows.length ? Math.round(rows.filter((r) => r.status !== "Vacant").length / rows.length * 100) : 0);
      } finally { setLoading(false); }
    })();
  }, []);

  return { data, rate, loading };
}

// ── Maintenance Cost ───────────────────────────────────────────────────────────
export interface MaintCostRow { category: string; amount: number }

export function useMaintCost() {
  const [data, setData] = useState<MaintCostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db().getAll("ops_costs").then((costs: any[]) => {
      const map: Record<string, number> = {};
      (costs || [])
        .filter((c) => c.workspaceId === WS)
        .forEach((c) => {
          const cat = c.category ?? "Other";
          map[cat] = (map[cat] ?? 0) + (c.amount ?? 0);
        });
      const rows = Object.entries(map).map(([category, amount]) => ({ category, amount }))
                         .sort((a, b) => b.amount - a.amount);
      setData(rows);
      setTotal(rows.reduce((s, r) => s + r.amount, 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { data, total, loading };
}

// ── Executive KPIs ────────────────────────────────────────────────────────────
export interface ExecKPIs {
  totalRentCollected: number;
  occupancyRate: number;
  openInvoicesAmount: number;
  overdueInvoicesAmount: number;
  apLiability: number;
  netIncome: number;
  openWorkOrders: number;
  pendingPOs: number;
}

export function useExecKPIs() {
  const [kpis, setKpis] = useState<ExecKPIs>({
    totalRentCollected: 0, occupancyRate: 0, openInvoicesAmount: 0,
    overdueInvoicesAmount: 0, apLiability: 0, netIncome: 0,
    openWorkOrders: 0, pendingPOs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [payments, invoices, finInvoices, journals, workOrders, pos, leases] = await Promise.all([
          db().getAll("ar_payments"),
          db().getAll("ar_invoices"),
          db().getAll("fin_vendor_invoices"),
          db().getAll("fin_journals"),
          db().getAll("ops_work_orders"),
          db().getAll("ops_purchase_orders"),
          db().getAll("ar_leases"),
        ]);

        const totalRentCollected = (payments || [])
          .filter((p: any) => p.workspaceId === WS && p.status === "Posted")
          .reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

        const openInvoicesAmount = (invoices || [])
          .filter((i: any) => i.workspaceId === WS && i.status === "Posted" && (i.amountDue ?? 0) > 0)
          .reduce((s: number, i: any) => s + (i.amountDue ?? 0), 0);

        const overdueInvoicesAmount = (invoices || [])
          .filter((i: any) => i.workspaceId === WS && i.status === "Posted" && (i.amountDue ?? 0) > 0 && (i.dueDate ?? "") < today)
          .reduce((s: number, i: any) => s + (i.amountDue ?? 0), 0);

        const apLiability = (finInvoices || [])
          .filter((i: any) => i.workspaceId === WS && ["Approved", "Partially Paid"].includes(i.status))
          .reduce((s: number, i: any) => s + (i.outstandingAmount ?? i.totalAmount ?? 0), 0);

        let revenue = 0, expenses = 0;
        (journals || [])
          .filter((j: any) => j.workspaceId === WS && j.status === "Posted")
          .forEach((j: any) => {
            (j.lines ?? []).forEach((l: any) => {
              if (l.accountType === "Revenue") revenue += l.credit ?? 0;
              if (l.accountType === "Expense") expenses += l.debit ?? 0;
            });
          });

        const openWorkOrders = (workOrders || [])
          .filter((w: any) => w.workspaceId === WS && ["Open", "In Progress"].includes(w.status)).length;

        const pendingPOs = (pos || [])
          .filter((p: any) => p.workspaceId === WS && ["Draft", "Approved"].includes(p.status)).length;

        const wsLeases = (leases || []).filter((l: any) => l.workspaceId === WS);
        const activeLeases = new Set(wsLeases.filter((l: any) => l.status === "Active" && l.endDate >= today).map((l: any) => l.unitId));
        const totalUnits = new Set(wsLeases.map((l: any) => l.unitId).filter(Boolean)).size;
        const occupancyRate = totalUnits ? Math.round((activeLeases.size / totalUnits) * 100) : 0;

        setKpis({ totalRentCollected, occupancyRate, openInvoicesAmount, overdueInvoicesAmount, apLiability, netIncome: revenue - expenses, openWorkOrders, pendingPOs });
      } finally { setLoading(false); }
    })();
  }, []);

  return { kpis, loading };
}
