import { useState, useEffect, useCallback } from "react";
import { IndexedDbAdapter } from "../integrations/service/storage.ts";
import { getBudService } from "./budService.ts";
import type { LegalEntity, Budget, BudgetLine, Forecast, ForecastLine } from "./types.ts";

const WS = "meridian-ventures";

let _adapter: IndexedDbAdapter | null = null;

export function budService() {
  if (!_adapter) _adapter = new IndexedDbAdapter();
  return getBudService(_adapter, WS);
}

type AsyncState<T> = { data: T; loading: boolean; error: string | null };

function useBudCollection<T>(
  fetch: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { refresh: () => Promise<void> } {
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

export function useEntities() {
  const state = useBudCollection<LegalEntity[]>(async () => {
    await budService().seedDefaultEntities();
    return budService().listEntities();
  }, []);
  return state;
}

export function useBudgets(entityId?: string) {
  return useBudCollection<Budget[]>(() => budService().listBudgets(entityId), [entityId]);
}

export function useBudget(id: string | undefined) {
  return useBudCollection<Budget | undefined>(
    () => id ? budService().getBudget(id) : Promise.resolve(undefined),
    [id],
  );
}

export function useBudgetLines(budgetId: string | undefined) {
  return useBudCollection<BudgetLine[]>(
    () => budgetId ? budService().listBudgetLines(budgetId) : Promise.resolve([]),
    [budgetId],
  );
}

export function useForecasts(entityId?: string) {
  return useBudCollection<Forecast[]>(() => budService().listForecasts(entityId), [entityId]);
}

export function useForecastLines(forecastId: string | undefined) {
  return useBudCollection<ForecastLine[]>(
    () => forecastId ? budService().listForecastLines(forecastId) : Promise.resolve([]),
    [forecastId],
  );
}
