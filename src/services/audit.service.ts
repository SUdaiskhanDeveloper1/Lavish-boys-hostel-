import { supabase } from '@/api/supabaseClient';

interface AuditInput {
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'backup';
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Best-effort audit logging. Never throws — auditing must not break the
 * primary action it is recording.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      actor_id: userData.user?.id ?? null,
      actor_email: userData.user?.email ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      old_value: (input.oldValue ?? null) as never,
      new_value: (input.newValue ?? null) as never,
      device: navigator.userAgent,
    } as never);
  } catch {
    /* swallow — auditing is non-critical */
  }
}

export async function listAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
