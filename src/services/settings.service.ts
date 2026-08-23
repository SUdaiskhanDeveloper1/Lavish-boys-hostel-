import { supabase } from '@/api/supabaseClient';
import type { HostelSettings } from '@/types/models';
import { logAudit } from './audit.service';

export async function getSettings(): Promise<HostelSettings> {
  const { data, error } = await supabase.from('hostel_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data as HostelSettings;
}

export async function updateSettings(payload: Partial<HostelSettings>): Promise<HostelSettings> {
  const { data, error } = await supabase
    .from('hostel_settings')
    .update(payload)
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ action: 'update', entity: 'hostel_settings', entityId: '1', newValue: payload });
  return data as HostelSettings;
}
