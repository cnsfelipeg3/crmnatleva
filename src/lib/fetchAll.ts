import { supabase } from "@/integrations/supabase/client";

interface FetchAllOptions {
  order?: { column: string; ascending?: boolean };
  maxConcurrency?: number;
}

const inFlightRequests = new Map<string, Promise<any[]>>();

async function withQueryTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 15000): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Timeout ao buscar ${label}.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

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
    let firstQuery = (supabase.from as any)(table)
      .select(select, { count: "exact" })
      .range(0, batchSize - 1);

    if (options?.order) {
      firstQuery = firstQuery.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      });
    }

    const firstResult = await withQueryTimeout<any>(firstQuery as Promise<any>, `${table} (primeira página)`);
    const { data: firstPageData, error: firstPageError, count } = firstResult;
    if (firstPageError) throw firstPageError;

    const firstPage = firstPageData ?? [];
    const totalRows = count ?? firstPage.length;

    if (totalRows <= firstPage.length) return firstPage;

    const totalPages = Math.ceil(totalRows / batchSize);
    const pagesData: any[][] = new Array(totalPages);
    pagesData[0] = firstPage;

    for (let i = 1; i < totalPages; i += maxConcurrency) {
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

          const { data, error } = await withQueryTimeout<any>(query as Promise<any>, `${table} (página ${pageIndex + 1})`);
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
