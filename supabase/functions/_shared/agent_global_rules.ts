// ─── Cache simples in-memory por edge function instance (TTL 60s) ───
type CachedRules = { rules: Record<string, string>; fetchedAt: number };
let cache: CachedRules | null = null;
const TTL_MS = 60_000;

/**
 * Lê regras globais do banco com cache + fallback.
 * Em caso de erro/timeout, retorna {} (caller usa hardcoded como fallback).
 */
export async function fetchGlobalRules(
  supabaseUrl: string,
  serviceRoleKey: string,
  scope: "simulator" | "production",
): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.rules;
  }

  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 2000);

    const url =
      `${supabaseUrl}/rest/v1/agent_global_rules` +
      `?is_active=eq.true&scope=cs.{${scope}}&order=priority.asc`;

    const res = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[agent_global_rules] fetch failed: ${res.status}`);
      return {};
    }

    const rows = await res.json();
    const map: Record<string, string> = {};
    for (const r of rows || []) {
      if (r?.key && r?.content) map[r.key] = r.content;
    }

    cache = { rules: map, fetchedAt: now };
    return map;
  } catch (e) {
    console.warn(`[agent_global_rules] fetch error:`, e);
    return {};
  }
}

export function clearCache() {
  cache = null;
}
