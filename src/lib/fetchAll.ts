import { supabase } from "@/integrations/supabase/client";

interface FetchAllOptions {
  order?: { column: string; ascending?: boolean };
  maxRows?: number;
}

const inFlightRequests = new Map<string, Promise<any[]>>();

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
  const safeBatchSize = Math.max(100, Math.min(batchSize, 1000));
  const requestKey = JSON.stringify({ table, select, options, batchSize: safeBatchSize });

  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    const allRows: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + safeBatchSize - 1;

      let query = (supabase.from as any)(table)
        .select(select)
        .range(from, to);

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
      hasMore = page.length === safeBatchSize;
      from += safeBatchSize;
    }

    return allRows;
  })();

  inFlightRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}
