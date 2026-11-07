import type { ArSettings, Fx } from "./types.ts";

export class FxError extends Error {}

export function functionalCurrency(settings: ArSettings, entityId: string): string {
  return settings.entityCurrencies[entityId] || settings.groupCurrency;
}

/** Latest rate for the currency at or before the period. Never invented: missing rates raise an error. */
export function rateToGroup(settings: ArSettings, currency: string, period: string): number {
  if (currency === settings.groupCurrency) return 1;
  const candidates = settings.fxRates.filter((rate) => rate.currency === currency && rate.period <= period).sort((a, b) => b.period.localeCompare(a.period));
  const found = candidates[0];
  if (!found || !(found.rate > 0)) throw new FxError(`No exchange rate for ${currency} to ${settings.groupCurrency} at or before ${period}. Add it in AR Settings.`);
  return found.rate;
}

export function fxFor(settings: ArSettings, currency: string, entityId: string, period: string): Fx {
  const functional = functionalCurrency(settings, entityId);
  const toGroup = rateToGroup(settings, currency, period);
  const functionalToGroup = rateToGroup(settings, functional, period);
  return {
    currency,
    functionalCurrency: functional,
    groupCurrency: settings.groupCurrency,
    rateToFunctional: currency === functional ? 1 : toGroup / functionalToGroup,
    rateToGroup: toGroup,
    period,
  };
}

/** Closing-rate translation to group currency; falls back to the transaction's own rate when no closing rate exists. */
export function toGroupAt(settings: ArSettings, amount: number, currency: string, period: string, fallback?: Fx): number {
  try {
    return amount * rateToGroup(settings, currency, period);
  } catch {
    return amount * (fallback?.rateToGroup ?? 1);
  }
}
