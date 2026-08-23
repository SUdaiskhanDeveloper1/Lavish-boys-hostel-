import { supabase } from '@/api/supabaseClient';
import type { Employee, EmployeePayment, Paginated } from '@/types/models';
import { logAudit } from './audit.service';

export interface EmployeeQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: Employee['status'];
}

export async function listEmployees(q: EmployeeQuery): Promise<Paginated<Employee>> {
  let query = supabase.from('employees').select('*', { count: 'exact' });
  if (q.search) query = query.or(`full_name.ilike.%${q.search}%,phone.ilike.%${q.search}%`);
  if (q.status) query = query.eq('status', q.status);
  query = query.order('created_at', { ascending: false });
  const from = (q.page - 1) * q.pageSize;
  query = query.range(from, from + q.pageSize - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Employee[]) ?? [], total: count ?? 0 };
}

export async function createEmployee(payload: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ action: 'create', entity: 'employees', entityId: data.id, newValue: payload });
  return data as Employee;
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ action: 'update', entity: 'employees', entityId: id, newValue: payload });
  return data as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
  await logAudit({ action: 'delete', entity: 'employees', entityId: id });
}

// ── Salary / advance / bonus / deduction history ─────────────────────────
export async function listEmployeePayments(employeeId: string): Promise<EmployeePayment[]> {
  const { data, error } = await supabase
    .from('employee_payments')
    .select('*')
    .eq('employee_id', employeeId)
    .order('paid_on', { ascending: false });
  if (error) throw error;
  return (data as EmployeePayment[]) ?? [];
}

export async function addEmployeePayment(
  payload: Partial<EmployeePayment>,
): Promise<EmployeePayment> {
  const { data, error } = await supabase
    .from('employee_payments')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await logAudit({
    action: 'create',
    entity: 'employee_payments',
    entityId: data.id,
    newValue: payload,
  });
  return data as EmployeePayment;
}
