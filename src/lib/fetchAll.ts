import { supabase } from "@/integrations/supabase/client";

interface FetchAllOptions {
  order?: { column: string; ascending?: boolean };
  maxConcurrency?: number;
}

const inFlightRequests = new Map<string, Promise<any[]>>();

/**
 * Fetch all rows from a table, paginating past the 1000-row default limit
 * and loading pages in parallel (limited concurrency) for better performance.
 */
export async function fetchAllRows(
  table: string,
  select: string = "*",
  options?: FetchAllOptions,
  batchSize: number = 1000,
): Promise<any[]> {
  const maxConcurrency = Math.max(1, Math.min(options?.maxConcurrency ?? 4, 8));
  const requestKey = JSON.stringify({ table, select, options, batchSize });

  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    const { count, error: countError } = await (supabase.from as any)(table)
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    const totalRows = count ?? 0;
    if (totalRows === 0) return [];

    const totalPages = Math.ceil(totalRows / batchSize);
    const pagesData: any[][] = new Array(totalPages);

    for (let i = 0; i < totalPages; i += maxConcurrency) {
      const chunk = Array.from(
        { length: Math.min(maxConcurrency, totalPages - i) },
        (_, idx) => i + idx,
      );

      await Promise.all(
        chunk.map(async (pageIndex) => {
          const from = pageIndex * batchSize;
          const to = from + batchSize - 1;

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

          pagesData[pageIndex] = data ?? [];
        }),
      );
    }

    return pagesData.flat();
  })();

  inFlightRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}
