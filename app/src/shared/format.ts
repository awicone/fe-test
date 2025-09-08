export const nf = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
export const nfc = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function fmtUsd(n?: number) {
  if (!Number.isFinite(n)) return '$0';
  return `$${nfc.format(n!)}`;
}

export function fmtPrice(n?: number) {
  if (!Number.isFinite(n)) return '$0.00';
  const abs = Math.abs(n!);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return `$${new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(n!)}`;
}

export function fmtPc(n?: number) {
  if (!Number.isFinite(n)) return '0%';
  const v = (n! >= 0 ? '+' : '') + nf.format(n!);
  return `${v}%`;
}

export function fmtAge(d?: Date) {
  if (!d) return '-';
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 90) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 90) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}
