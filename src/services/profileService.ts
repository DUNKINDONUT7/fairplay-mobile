import { supabase } from '@/config/supabase';

export type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  status?: string | null;
};

// profiles.id equals auth.users.id (uuid stored as text) — a DB trigger
// (handle_new_auth_user) creates this row automatically on sign-up, reading
// role from the metadata the mobile Register screen already sends
// (App.tsx handleSignUp sets user_metadata.role = 'participant' — public
// self-registration only ever creates participant accounts).
export async function fetchOwnProfile(authUserId: string): Promise<ProfileRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUserId).maybeSingle();

  if (error) throw error;
  return (data as ProfileRow) || null;
}
