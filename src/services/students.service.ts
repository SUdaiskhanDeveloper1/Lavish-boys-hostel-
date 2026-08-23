import { supabase } from '@/api/supabaseClient';
import type {
  Paginated,
  Student,
  StudentFinancials,
  StudentStatus,
  StudentTimelineEvent,
} from '@/types/models';
import { logAudit } from './audit.service';

export interface StudentQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: StudentStatus;
  roomId?: string;
  sortBy?: keyof Student;
  sortDir?: 'asc' | 'desc';
}

const SELECT = '*, room:rooms(id, room_number)';

export async function listStudents(q: StudentQuery): Promise<Paginated<Student>> {
  let query = supabase.from('students').select(SELECT, { count: 'exact' });

  if (q.search) {
    query = query.or(
      `full_name.ilike.%${q.search}%,cnic.ilike.%${q.search}%,phone.ilike.%${q.search}%`,
    );
  }
  if (q.status) query = query.eq('status', q.status);
  if (q.roomId) query = query.eq('room_id', q.roomId);

  query = query.order(q.sortBy ?? 'created_at', {
    ascending: (q.sortDir ?? 'desc') === 'asc',
  });

  const from = (q.page - 1) * q.pageSize;
  query = query.range(from, from + q.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as unknown as Student[]) ?? [], total: count ?? 0 };
}

export async function getStudent(id: string): Promise<Student> {
  const { data, error } = await supabase.from('students').select(SELECT).eq('id', id).single();
  if (error) throw error;
  return data as unknown as Student;
}

export async function createStudent(payload: Partial<Student>): Promise<Student> {
  const { room, ...clean } = payload;
  void room;
  const { data, error } = await supabase
    .from('students')
    .insert(clean)
    .select(SELECT)
    .single();
  if (error) throw error;
  await addTimeline(data.id, 'admission', 'Student admitted');
  await logAudit({ action: 'create', entity: 'students', entityId: data.id, newValue: clean });
  return data as unknown as Student;
}

export async function updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
  const { room, ...clean } = payload;
  void room;
  const { data, error } = await supabase
    .from('students')
    .update(clean)
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw error;
  await logAudit({ action: 'update', entity: 'students', entityId: id, newValue: clean });
  return data as unknown as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
  await logAudit({ action: 'delete', entity: 'students', entityId: id });
}

export async function getStudentFinancials(id: string): Promise<StudentFinancials | null> {
  const { data, error } = await supabase
    .from('student_financials')
    .select('*')
    .eq('student_id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as StudentFinancials | null) ?? null;
}

// ── Timeline ────────────────────────────────────────────────────────────
export async function getTimeline(studentId: string): Promise<StudentTimelineEvent[]> {
  const { data, error } = await supabase
    .from('student_timeline')
    .select('*')
    .eq('student_id', studentId)
    .order('event_date', { ascending: false });
  if (error) throw error;
  return (data as StudentTimelineEvent[]) ?? [];
}

export async function addTimeline(
  studentId: string,
  eventType: StudentTimelineEvent['event_type'],
  title: string,
  detail?: string,
): Promise<void> {
  await supabase.from('student_timeline').insert({
    student_id: studentId,
    event_type: eventType,
    title,
    detail: detail ?? null,
  });
}
