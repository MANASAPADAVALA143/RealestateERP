import { useState, useEffect, useCallback } from "react";
import { IndexedDbAdapter } from "../integrations/service/storage.ts";
import { getFinService } from "./finService.ts";
import type {
  Account, AccountingPeriod, JournalEntry, VendorInvoice, APPayment,
  BankAccount, BankReconciliation,
} from "./types.ts";

const WS = "meridian-ventures";

let _adapter: IndexedDbAdapter | null = null;

export function finService() {
  if (!_adapter) _adapter = new IndexedDbAdapter();
  return getFinService(_adapter, WS);
}

type AsyncState<T> = { data: T; loading: boolean; error: string | null };

function useFinCollection<T>(fetch: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined as T, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetch();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}

export function useAccounts() {
  return useFinCollection<Account[]>(() => finService().listAccounts(), []);
}

export function usePeriods() {
  return useFinCollection<AccountingPeriod[]>(() => finService().listPeriods(), []);
}

export function useJournals(periodId?: string) {
  return useFinCollection<JournalEntry[]>(() => finService().listJournals(periodId), [periodId]);
}

export function useVendorInvoices(vendorId?: string) {
  return useFinCollection<VendorInvoice[]>(() => finService().listVendorInvoices(vendorId), [vendorId]);
}

export function useApPayments(vendorId?: string) {
  return useFinCollection<APPayment[]>(() => finService().listPayments(vendorId), [vendorId]);
}

export function useBankAccounts() {
  return useFinCollection<BankAccount[]>(() => finService().listBankAccounts(), []);
}

export function useBankReconciliations() {
  return useFinCollection<BankReconciliation[]>(() => finService().listReconciliations(), []);
}

export function useFinDashboard() {
  return useFinCollection(() => finService().getDashboardSummary(), []);
}

export function useTrialBalance(periodId?: string) {
  return useFinCollection(() => finService().getTrialBalance(periodId), [periodId]);
}

export function usePnL(fromDate?: string, toDate?: string) {
  return useFinCollection(() => finService().getPnL(fromDate, toDate), [fromDate, toDate]);
}

export function useBalanceSheet(asOfDate?: string) {
  return useFinCollection(() => finService().getBalanceSheet(asOfDate), [asOfDate]);
}
