export function relativeTime(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined) return '';
  const ms = typeof iso === 'number' ? iso : new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}
