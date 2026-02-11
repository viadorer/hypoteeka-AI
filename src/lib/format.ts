export function formatCZK(num: number): string {
  return num.toLocaleString('cs-CZ') + ' Kč';
}

export function formatPercent(num: number, decimals = 1): string {
  return (num * 100).toFixed(decimals).replace('.', ',') + ' %';
}

export function formatNumber(num: number): string {
  return num.toLocaleString('cs-CZ');
}
