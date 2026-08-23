import { supabase } from '@/api/supabaseClient';
import type { Paginated, Room, RoomStatus } from '@/types/models';
import { logAudit } from './audit.service';

export interface RoomQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: RoomStatus;
  sortBy?: keyof Room;
  sortDir?: 'asc' | 'desc';
}

export async function listRooms(q: RoomQuery): Promise<Paginated<Room>> {
  let query = supabase.from('rooms').select('*', { count: 'exact' });

  if (q.search) query = query.ilike('room_number', `%${q.search}%`);
  if (q.status) query = query.eq('status', q.status);

  query = query.order(q.sortBy ?? 'room_number', {
    ascending: (q.sortDir ?? 'asc') === 'asc',
  });

  const from = (q.page - 1) * q.pageSize;
  query = query.range(from, from + q.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Room[]) ?? [], total: count ?? 0 };
}

export async function getRoom(id: string): Promise<Room> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Room;
}

export async function createRoom(payload: Partial<Room>): Promise<Room> {
  const { data, error } = await supabase.from('rooms').insert(payload).select().single();
  if (error) throw error;
  await logAudit({ action: 'create', entity: 'rooms', entityId: data.id, newValue: data });
  return data as Room;
}

export async function updateRoom(id: string, payload: Partial<Room>): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ action: 'update', entity: 'rooms', entityId: id, newValue: payload });
  return data as Room;
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
  await logAudit({ action: 'delete', entity: 'rooms', entityId: id });
}

/** Rooms that still have a free seat — used by the student form. */
export async function listAvailableRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'active')
    .order('room_number');
  if (error) throw error;
  return ((data as Room[]) ?? []).filter((r) => r.occupied_seats < r.capacity);
}
