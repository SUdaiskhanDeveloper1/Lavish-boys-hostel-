import { supabase } from '@/api/supabaseClient';
import type { Expense, Paginated } from '@/types/models';
import { logAudit } from './audit.service';

export interface ExpenseQuery {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  from?: string;
  to?: string;
}

export async function listExpenses(q: ExpenseQuery): Promise<Paginated<Expense>> {
  let query = supabase.from('expenses').select('*', { count: 'exact' });

  if (q.search) query = query.or(`title.ilike.%${q.search}%,paid_to.ilike.%${q.search}%`);
  if (q.category) query = query.eq('category', q.category);
  if (q.from) query = query.gte('spent_on', q.from);
  if (q.to) query = query.lte('spent_on', q.to);

  query = query.order('spent_on', { ascending: false });
  const from = (q.page - 1) * q.pageSize;
  query = query.range(from, from + q.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Expense[]) ?? [], total: count ?? 0 };
}

export async function createExpense(payload: Partial<Expense>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ action: 'create', entity: 'expenses', entityId: data.id, newValue: payload });
  return data as Expense;
}

export async function updateExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ action: 'update', entity: 'expenses', entityId: id, newValue: payload });
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
  await logAudit({ action: 'delete', entity: 'expenses', entityId: id });
}
