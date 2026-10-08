export function formatAED(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `AED ${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `AED ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `AED ${(value / 1_000).toFixed(1)}K`;
  }
  return `AED ${value.toLocaleString()}`;
}

export function formatAEDShort(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  return `${value.toLocaleString()}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
