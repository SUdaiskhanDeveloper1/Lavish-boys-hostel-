import { supabase } from '@/api/supabaseClient';

export interface ReportRange {
  from: string; // YYYY-MM-DD
  to: string;
}

export interface ReportResult {
  income: number;
  expense: number;
  salary: number;
  profit: number;
  pendingFees: number;
  occupiedRooms: number;
  vacantRooms: number;
  activeStudents: number;
  incomeRows: { paid_on: string; amount: number; receipt_no: string }[];
  expenseRows: { spent_on: string; amount: number; title: string; category: string }[];
}

export async function buildReport(range: ReportRange): Promise<ReportResult> {
  const [{ data: inc }, { data: exp }, { data: sal }, { data: rooms }, { data: pend }, { count: activeStudents }] =
    await Promise.all([
      supabase
        .from('fee_payments')
        .select('paid_on, amount, receipt_no')
        .gte('paid_on', range.from)
        .lte('paid_on', range.to)
        .order('paid_on'),
      supabase
        .from('expenses')
        .select('spent_on, amount, title, category')
        .gte('spent_on', range.from)
        .lte('spent_on', range.to)
        .order('spent_on'),
      supabase
        .from('employee_payments')
        .select('amount, paid_on')
        .gte('paid_on', range.from)
        .lte('paid_on', range.to),
      supabase.from('rooms').select('capacity, occupied_seats, status').eq('status', 'active'),
      supabase
        .from('student_financials')
        .select('pending_amount, status')
        .eq('status', 'active')
        .gt('pending_amount', 0),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

  const incRows = (inc ?? []) as unknown as ReportResult['incomeRows'];
  const expRows = (exp ?? []) as unknown as ReportResult['expenseRows'];
  const salRows = (sal ?? []) as unknown as { amount: number }[];
  const pendRows = (pend ?? []) as unknown as { pending_amount: number }[];
  const roomRows = (rooms ?? []) as unknown as { capacity: number; occupied_seats: number }[];

  const income = incRows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const expense = expRows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const salary = salRows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const pendingFees = pendRows.reduce((a, r) => a + Number(r.pending_amount ?? 0), 0);
  const occupiedRooms = roomRows.filter((r) => Number(r.occupied_seats) > 0).length;
  const vacantRooms = roomRows.filter((r) => Number(r.occupied_seats) < Number(r.capacity)).length;

  return {
    income,
    expense,
    salary,
    profit: income - expense - salary,
    pendingFees,
    occupiedRooms,
    vacantRooms,
    activeStudents: activeStudents ?? 0,
    incomeRows: incRows,
    expenseRows: expRows,
  };
}
