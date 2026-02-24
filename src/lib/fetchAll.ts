import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all rows from a Supabase table, paginating past the 1000-row default limit.
 */
export async function fetchAllRows(
  table: string,
  select: string = "*",
  options?: {
    order?: { column: string; ascending?: boolean };
  },
  batchSize: number = 1000
): Promise<any[]> {
  const allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = (supabase.from as any)(table).select(select).range(offset, offset + batchSize - 1);

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}