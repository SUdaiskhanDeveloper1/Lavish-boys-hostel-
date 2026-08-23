import { supabase } from '@/api/supabaseClient';

/**
 * Upload a file to a private Supabase Storage bucket and return the stored
 * path. Use `signedUrl()` to render it later.
 */
export async function uploadFile(
  bucket: string,
  file: File,
  prefix = '',
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const safe = `${prefix ? prefix + '/' : ''}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(safe, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return safe;
}

/** Create a temporary signed URL for a private object. */
export async function signedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function removeFile(bucket: string, path: string): Promise<void> {
  await supabase.storage.from(bucket).remove([path]);
}
