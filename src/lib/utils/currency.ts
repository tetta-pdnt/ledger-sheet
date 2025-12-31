export function formatCurrency(
  amount: number,
  currency: string = 'JPY',
  locale: string = 'ja-JP',
  showDecimals: boolean = false
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

export function formatNumber(
  amount: number,
  locale: string = 'ja-JP',
  compact: boolean = false
): string {
  if (compact && Math.abs(amount) >= 10000) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(amount);
  }
  return new Intl.NumberFormat(locale).format(amount);
}

export function parseCurrency(value: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[¥$€£,\s]/g, '');
  return parseFloat(cleaned) || 0;
}
