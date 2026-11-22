import { useCallback, useEffect, useState } from "react";
import { IndexedDbAdapter } from "../integrations/service/storage.ts";
import { OpsService } from "./opsService.ts";
import type {
  MaintRequest, WorkOrder, PmSchedule, FacilityAsset,
  Vendor, VendorContract, PurchaseRequisition, Quotation,
  PurchaseOrder, GoodsReceipt, OpsCost,
} from "./types.ts";

const WORKSPACE = "meridian-ventures";

let _db: IndexedDbAdapter | null = null;
function getDb(): IndexedDbAdapter {
  if (!_db) _db = new IndexedDbAdapter();
  return _db;
}

let _svc: OpsService | null = null;
export function opsService(): OpsService {
  if (!_svc) _svc = new OpsService(getDb(), WORKSPACE);
  return _svc;
}

type LoadState<T> = { data: T; loading: boolean; error: string | null };

function useOpsCollection<T>(load: () => Promise<T[]>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T[]>>({ data: [], loading: true, error: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await load();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({ data: [], loading: false, error: String(e) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void refresh(); }, [refresh]);
  return { ...state, refresh };
}

export function useRequests() {
  const svc = opsService();
  return useOpsCollection<MaintRequest>(() => svc.listRequests());
}

export function useWorkOrders() {
  const svc = opsService();
  return useOpsCollection<WorkOrder>(() => svc.listWorkOrders());
}

export function usePmSchedules() {
  const svc = opsService();
  return useOpsCollection<PmSchedule>(() => svc.listPmSchedules());
}

export function useAssets() {
  const svc = opsService();
  return useOpsCollection<FacilityAsset>(() => svc.listAssets());
}

export function useVendors() {
  const svc = opsService();
  return useOpsCollection<Vendor>(() => svc.listVendors());
}

export function useContracts() {
  const svc = opsService();
  return useOpsCollection<VendorContract>(() => svc.listContracts());
}

export function useRequisitions() {
  const svc = opsService();
  return useOpsCollection<PurchaseRequisition>(() => svc.listRequisitions());
}

export function useQuotations(prId?: string) {
  const svc = opsService();
  return useOpsCollection<Quotation>(() => svc.listQuotations(prId), [prId]);
}

export function usePurchaseOrders() {
  const svc = opsService();
  return useOpsCollection<PurchaseOrder>(() => svc.listPurchaseOrders());
}

export function useGoodsReceipts(poId?: string) {
  const svc = opsService();
  return useOpsCollection<GoodsReceipt>(() => svc.listGoodsReceipts(poId), [poId]);
}

export function useCosts(propertyId?: string) {
  const svc = opsService();
  return useOpsCollection<OpsCost>(() => svc.listCosts(propertyId), [propertyId]);
}

export function useOpsDashboard() {
  const [summary, setSummary] = useState<Awaited<ReturnType<OpsService["getDashboardSummary"]>> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await opsService().getDashboardSummary();
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { summary, loading, refresh };
}
