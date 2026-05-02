import { supabase } from "@/integrations/supabase/client";

interface FetchAllOptions {
  order?: { column: string; ascending?: boolean };
  maxRows?: number;
  cacheMs?: number;
  bypassCache?: boolean;
  // Optional simple filters applied via `.is()` (e.g. { excluded_at: null }).
  isFilters?: Record<string, null | boolean>;
}

const inFlightRequests = new Map<string, Promise<any[]>>();
const resultCache = new Map<string, { rows: any[]; expiresAt: number }>();
// Aumentado de 60s -> 120s. Voltar pra mesma tela em até 2min vira instantâneo
// (sem requisição de rede), e chamadas com cacheMs explícito não são afetadas.
const DEFAULT_CACHE_MS = 120_000;
const MAX_CACHE_ENTRIES = 80;
const MAX_PAGE_FETCHES = 500;

function pruneCache() {
  if (resultCache.size <= MAX_CACHE_ENTRIES) return;
  const oldestKey = resultCache.keys().next().value;
  if (oldestKey) resultCache.delete(oldestKey);
}

/**
 * Fetch all rows from a table, paginating past the 1000-row default limit.
 * Uses range pagination without COUNT to avoid expensive full-table counting.
 */
export async function fetchAllRows(
  table: string,
  select: string = "*",
  options?: FetchAllOptions,
  batchSize: number = 1000,
): Promise<any[]> {
  const maxRows = options?.maxRows && options.maxRows > 0 ? options.maxRows : undefined;
  const safeBatchSize = Math.max(1, Math.min(batchSize, maxRows ?? 1000, 1000));
  const requestKey = JSON.stringify({ table, select, options: { ...options, bypassCache: undefined }, batchSize: safeBatchSize });
  const cacheMs = Math.max(0, options?.cacheMs ?? DEFAULT_CACHE_MS);

  if (!options?.bypassCache && cacheMs > 0) {
    const cached = resultCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rows.slice();
    }
    if (cached) resultCache.delete(requestKey);
  }

  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    const allRows: any[] = [];
    let from = 0;
    let hasMore = true;
    let pageFetches = 0;

    while (hasMore) {
      pageFetches += 1;
      if (pageFetches > MAX_PAGE_FETCHES) {
        console.warn(`fetchAllRows reached safety page limit for table "${table}". Returning partial data.`, {
          table,
          fetchedRows: allRows.length,
          batchSize: safeBatchSize,
        });
        break;
      }
      const to = from + safeBatchSize - 1;

      let query = (supabase.from as any)(table)
        .select(select)
        .range(from, to);

      if (options?.isFilters) {
        for (const [col, val] of Object.entries(options.isFilters)) {
          query = query.is(col, val);
        }
      }

      if (options?.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true,
        });
      }

      const { data, error } = await query;
      if (error) throw error;

      const page = data ?? [];
      if (page.length === 0) break;

      if (options?.maxRows && allRows.length + page.length > options.maxRows) {
        allRows.push(...page.slice(0, options.maxRows - allRows.length));
        break;
      }

      allRows.push(...page);
      if (maxRows && allRows.length >= maxRows) break;
      hasMore = page.length === safeBatchSize;
      from += safeBatchSize;
    }

    return allRows;
  })();

  inFlightRequests.set(requestKey, requestPromise);

  try {
    const rows = await requestPromise;

    if (!options?.bypassCache && cacheMs > 0) {
      resultCache.set(requestKey, {
        rows: rows.slice(),
        expiresAt: Date.now() + cacheMs,
      });
      pruneCache();
    }

    return rows;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}
