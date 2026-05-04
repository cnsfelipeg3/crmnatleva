// ─── Generic formatting helpers ───

export function formatBytes(bytes?: number | null, decimals = 1): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const formatted = i === 0 ? String(value) : value.toFixed(decimals);
  return `${formatted} ${units[i]}`;
}
