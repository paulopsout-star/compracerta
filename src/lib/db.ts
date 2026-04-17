import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to run typed queries
export async function query<T = Record<string, unknown>>(
  table: string,
  options?: {
    select?: string;
    filter?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
) {
  let q = supabase.from(table).select(options?.select ?? "*");

  if (options?.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      q = q.eq(key, value);
    }
  }
  if (options?.order) {
    q = q.order(options.order.column, { ascending: options.order.ascending ?? false });
  }
  if (options?.limit) q = q.limit(options.limit);
  if (options?.offset) q = q.range(options.offset, options.offset + (options?.limit ?? 20) - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return data as T[];
}

export async function insert<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>
) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as T;
}

export async function update<T = Record<string, unknown>>(
  table: string,
  id: string,
  data: Record<string, unknown>
) {
  const { data: result, error } = await supabase
    .from(table)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as T;
}

export async function remove(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function findById<T = Record<string, unknown>>(
  table: string,
  id: string,
  select?: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(select ?? "*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as T;
}
