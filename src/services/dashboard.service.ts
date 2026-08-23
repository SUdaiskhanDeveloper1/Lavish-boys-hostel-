import dayjs from 'dayjs';
import { supabase } from '@/api/supabaseClient';
import type { FeePayment } from '@/types/models';

export interface DashboardStats {
  todayIncome: number;
  todayExpense: number;
  todaySalary: number;
  weeklyIncome: number;
  weeklyExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalStudents: number;
  totalRooms: number;
  occupiedBeds: number;
  vacantBeds: number;
  availableRooms: number;
  leavingSoon: number;
  pendingFeesCount: number;
  series: { day: string; income: number; expense: number }[];
  recent: FeePayment[];
}

async function sum(table: 'fee_payments' | 'expenses', column: string, from: string, to: string) {
  const dateCol = table === 'fee_payments' ? 'paid_on' : 'spent_on';
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .gte(dateCol, from)
    .lte(dateCol, to);
  if (error) throw error;
  return (data as unknown as Record<string, number>[]).reduce(
    (acc, r) => acc + Number(r[column] ?? 0),
    0,
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = dayjs().format('YYYY-MM-DD');
  const weekAgo = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
  const soon = dayjs().add(15, 'day').format('YYYY-MM-DD');

  const [
    todayIncome,
    todayExpense,
    weeklyIncome,
    weeklyExpense,
    monthlyIncome,
    monthlyExpense,
  ] = await Promise.all([
    sum('fee_payments', 'amount', today, today),
    sum('expenses', 'amount', today, today),
    sum('fee_payments', 'amount', weekAgo, today),
    sum('expenses', 'amount', weekAgo, today),
    sum('fee_payments', 'amount', monthStart, monthEnd),
    sum('expenses', 'amount', monthStart, monthEnd),
  ]);

  // Today's salary paid
  const { data: salaryRows } = await supabase
    .from('employee_payments')
    .select('amount, txn_type, paid_on')
    .eq('paid_on', today);
  const todaySalary = ((salaryRows ?? []) as unknown as {
    amount: number;
    txn_type: string;
    paid_on: string;
  }[])
    .filter((r) => r.txn_type === 'salary' || r.txn_type === 'advance' || r.txn_type === 'bonus')
    .reduce((a, r) => a + Number(r.amount ?? 0), 0);

  // Strength
  const [{ count: totalStudents }, { data: rooms }] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rooms').select('capacity, occupied_seats, status'),
  ]);

  const activeRooms = ((rooms ?? []) as unknown as {
    capacity: number;
    occupied_seats: number;
    status: string;
  }[]).filter((r) => r.status === 'active');
  const occupiedBeds = activeRooms.reduce((a, r) => a + Number(r.occupied_seats ?? 0), 0);
  const capacity = activeRooms.reduce((a, r) => a + Number(r.capacity ?? 0), 0);
  const availableRooms = activeRooms.filter(
    (r) => Number(r.occupied_seats) < Number(r.capacity),
  ).length;

  const { count: leavingSoon } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('leaving_date', 'is', null)
    .lte('leaving_date', soon)
    .gte('leaving_date', today);

  // Pending fees (from view)
  const { data: pending } = await supabase
    .from('student_financials')
    .select('student_id, pending_amount, status')
    .eq('status', 'active')
    .gt('pending_amount', 0);

  // 7-day series
  const days = Array.from({ length: 7 }).map((_, i) =>
    dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD'),
  );
  const [{ data: incRows }, { data: expRows }] = await Promise.all([
    supabase.from('fee_payments').select('paid_on, amount').gte('paid_on', weekAgo),
    supabase.from('expenses').select('spent_on, amount').gte('spent_on', weekAgo),
  ]);
  const inc = (incRows ?? []) as unknown as { paid_on: string; amount: number }[];
  const exp = (expRows ?? []) as unknown as { spent_on: string; amount: number }[];
  const series = days.map((d) => ({
    day: dayjs(d).format('ddd'),
    income: inc.filter((r) => r.paid_on === d).reduce((a, r) => a + Number(r.amount ?? 0), 0),
    expense: exp.filter((r) => r.spent_on === d).reduce((a, r) => a + Number(r.amount ?? 0), 0),
  }));

  const { data: recent } = await supabase
    .from('fee_payments')
    .select('*, student:students(id, full_name, phone)')
    .order('created_at', { ascending: false })
    .limit(8);

  return {
    todayIncome,
    todayExpense,
    todaySalary,
    weeklyIncome,
    weeklyExpense,
    monthlyIncome,
    monthlyExpense,
    totalStudents: totalStudents ?? 0,
    totalRooms: (rooms ?? []).length,
    occupiedBeds,
    vacantBeds: capacity - occupiedBeds,
    availableRooms,
    leavingSoon: leavingSoon ?? 0,
    pendingFeesCount: (pending ?? []).length,
    series,
    recent: (recent as unknown as FeePayment[]) ?? [],
  };
}
