// ─── Humanize media download failure reasons captured by media-downloader / watchdog ───

export function humanizeMediaFailure(reason?: string | null): string {
  if (!reason) return "Não foi possível baixar a mídia";
  const r = reason.toLowerCase();
  if (r.includes("watchdog_stuck")) return "Mídia travou no download · marcada como falha";
  if (r.includes("http_error_404") || r.includes("not_found")) return "Mídia expirou no provedor (link 404)";
  if (r.includes("http_error_403") || r.includes("forbidden")) return "Acesso negado pelo provedor (403)";
  if (r.includes("http_error_410")) return "Mídia removida pelo provedor (410)";
  if (r.includes("http_error_5")) return "Provedor instável durante o download";
  if (r.includes("timeout") || r.includes("aborted")) return "Tempo esgotado ao baixar a mídia";
  if (r.includes("storage")) return "Falha ao salvar a mídia no armazenamento";
  if (r.includes("download_failed")) return "Falha ao baixar a mídia";
  return "Não foi possível baixar a mídia";
}
