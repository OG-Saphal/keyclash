import { supabase } from '../lib/supabase';
import { rowToProfile } from './auth.service';
import type { UserProfile } from '../types/auth';

const AVATAR_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'avatars';

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  fields: { display_name?: string; username?: string; avatar_url?: string | null },
): Promise<UserProfile> {
  const { data, error } = await (supabase.from('profiles') as any)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const { data: { user } } = await supabase.auth.getUser();
  return rowToProfile(
    data as Record<string, unknown>,
    user?.email ?? '',
    user?.email_confirmed_at,
  );
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('check_username_available', {
    username_input: username,
  });
  if (error) throw new Error(error.message);
  return data as boolean;
}

// ─── Password / Email ─────────────────────────────────────────────────────────

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('No authenticated user.');

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error('Current password is incorrect.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw new Error(error.message);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const resized = await resizeImage(file, 300);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, resized, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  await updateProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

export async function removeAvatar(userId: string): Promise<void> {
  await supabase.storage.from(AVATAR_BUCKET).remove([
    `${userId}/avatar.jpg`,
    `${userId}/avatar.jpeg`,
    `${userId}/avatar.png`,
    `${userId}/avatar.webp`,
  ]);
  await updateProfile(userId, { avatar_url: null });
}

// ─── Image Resize Helper ──────────────────────────────────────────────────────

function resizeImage(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas is empty')),
        file.type,
        0.9,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
