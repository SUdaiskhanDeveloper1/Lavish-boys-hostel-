import { supabase } from '@/api/supabaseClient';
import type { FeePayment, Paginated } from '@/types/models';
import { logAudit } from './audit.service';
import { addTimeline } from './students.service';

export interface FeeQuery {
  page: number;
  pageSize: number;
  search?: string;
  studentId?: string;
  from?: string;
  to?: string;
}

const SELECT = '*, student:students(id, full_name, phone)';

export async function listFees(q: FeeQuery): Promise<Paginated<FeePayment>> {
  let query = supabase.from('fee_payments').select(SELECT, { count: 'exact' });

  if (q.search) query = query.ilike('receipt_no', `%${q.search}%`);
  if (q.studentId) query = query.eq('student_id', q.studentId);
  if (q.from) query = query.gte('paid_on', q.from);
  if (q.to) query = query.lte('paid_on', q.to);

  query = query.order('created_at', { ascending: false });
  const from = (q.page - 1) * q.pageSize;
  query = query.range(from, from + q.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as unknown as FeePayment[]) ?? [], total: count ?? 0 };
}

export async function getReceipt(id: string): Promise<FeePayment> {
  const { data, error } = await supabase.from('fee_payments').select(SELECT).eq('id', id).single();
  if (error) throw error;
  return data as unknown as FeePayment;
}

export async function collectFee(payload: Partial<FeePayment>): Promise<FeePayment> {
  const { student, ...clean } = payload;
  void student;
  const { data, error } = await supabase
    .from('fee_payments')
    .insert(clean)
    .select(SELECT)
    .single();
  if (error) throw error;
  if (data.student_id) {
    await addTimeline(
      data.student_id,
      'fee_paid',
      `Fee received — ${data.receipt_no}`,
      `Amount: ${data.amount}`,
    );
  }
  await logAudit({
    action: 'create',
    entity: 'fee_payments',
    entityId: data.id,
    newValue: clean,
  });
  return data as unknown as FeePayment;
}

export async function attachReceiptPdf(
  id: string,
  pdfUrl: string,
  driveFileId?: string,
): Promise<void> {
  await supabase
    .from('fee_payments')
    .update({ pdf_url: pdfUrl, drive_file_id: driveFileId ?? null })
    .eq('id', id);
}
