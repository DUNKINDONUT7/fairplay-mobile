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

// Used to gate the forgot-password flow: only an email that actually has a
// FairPlay account should be able to trigger a reset link. profiles has a
// public "Allow profile list for demo dashboards" read policy (to anon,
// using true — not dropped by the later ownership lockdown, unlike the
// matching write policy), so this works even for a signed-out caller.
export async function emailHasAccount(email: string): Promise<boolean> {
  if (!supabase) return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;

  const { data } = await supabase.from('profiles').select('id').ilike('email', trimmed).limit(1).maybeSingle();
  return Boolean(data);
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

// Mirrors authStore.js's updateCredentials on web: Supabase Auth has no
// direct "verify this password" call, so the current password is checked by
// re-signing-in with it (this also refreshes the session) before calling
// updateUser — otherwise anyone with a still-open session could change the
// password without ever knowing the old one.
export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };
  if (!email) return { success: false, error: 'Unable to verify your account. Please sign in again.' };

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return { success: false, error: 'Your current password is incorrect.' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message || 'Unable to update your password. Please try again.' };
  return { success: true };
}
