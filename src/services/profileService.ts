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

// Safety net for self-registered accounts still ending up with
// profiles.role = 'organizer': App.tsx handleSignUp already sends
// role: 'participant' in the sign-up metadata for the DB trigger
// (handle_new_auth_user) to read, but that trigger lives outside this repo
// (web app's Supabase project) and isn't reliably picking it up. This forces
// the row to participant immediately after OUR OWN sign-up call succeeds —
// it never runs on a plain sign-in, so it can never downgrade a real
// admin-created organizer account. Upsert (not update) because the trigger
// may not have committed the row yet. Best-effort: failure here must not
// block the "account created" success message.
export async function ensureParticipantProfile(authUserId: string, email: string, fullName: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from('profiles').upsert({ id: authUserId, email, full_name: fullName, role: 'participant' }, { onConflict: 'id' });
  } catch {
    // best-effort only — the DB trigger may still succeed on its own
  }
}

type ActionResult = { success: boolean; error?: string };

// Writes to the same `profiles` row the web app reads for its own account
// page, so a name change made here shows up there immediately — no separate
// mobile-only profile store. Only full_name is user-editable: role/status are
// governance fields (admin/organizer approval workflow), not self-service.
export async function updateOwnProfile(authUserId: string, updates: { full_name: string }): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const { error } = await supabase.from('profiles').update({ full_name: updates.full_name }).eq('id', authUserId);
  if (error) return { success: false, error: 'Unable to update your profile. Please try again.' };
  return { success: true };
}
