import { supabase } from '@/config/supabase';
import type { EventRow, JudgeAssignmentRow, JudgeInviteRow, JudgeRow } from '@/types/organizer';

export async function fetchJudgeAssignments(eventId: number): Promise<JudgeAssignmentRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('judge_assignments')
    .select('*')
    .eq('event_id', eventId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data || []) as JudgeAssignmentRow[];
}

export async function fetchJudgesByIds(judgeIds: number[]): Promise<JudgeRow[]> {
  if (!supabase || judgeIds.length === 0) return [];

  const { data, error } = await supabase.from('judges').select('*').in('id', judgeIds);

  if (error) throw error;
  return (data || []) as JudgeRow[];
}

export async function fetchJudgeInvites(eventId: number): Promise<JudgeInviteRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('judge_invites')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as JudgeInviteRow[];
}

export function subscribeToJudgeData(eventId: number, onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-judges-${eventId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_assignments', filter: `event_id=eq.${eventId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_invites', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

type InviteJudgeResult = { success: boolean; error?: string; message?: string };

// Calls the SAME Supabase Edge Function the web app uses
// (supabase/functions/notify-judge-invite) so the invite row, token, judge
// auth account, and email are created exactly the way the web app creates
// them — no separate mobile-only invite system.
export async function inviteJudgeByEmail(event: EventRow, judgeName: string, judgeEmail: string): Promise<InviteJudgeResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured yet.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('notify-judge-invite', {
      body: {
        eventId: event.id,
        eventTitle: event.title,
        judgeName: judgeName.trim(),
        judgeEmail: judgeEmail.trim().toLowerCase(),
        eventStartDate: event.start_date || event.scheduled_date || '',
        eventStartTime: '',
        eventEndTime: '',
        eventLocation: event.location || '',
      },
    });

    if (error) {
      return { success: false, error: friendlyInviteError(error.message) };
    }

    if (data && (data as { sent?: boolean }).sent === false) {
      return { success: false, error: 'Unable to send the invitation right now. Please try again.' };
    }

    return { success: true, message: `Invitation sent to ${judgeEmail.trim()}.` };
  } catch (err) {
    return { success: false, error: friendlyInviteError(err instanceof Error ? err.message : String(err)) };
  }
}

type ActionResult = { success: boolean; error?: string };

// Mirrors src/store/judgeStore.js `revokeInvite()`: calls the SAME
// SECURITY DEFINER RPC the web app uses. It marks every pending invite for
// that judge+event as revoked AND flips the matching judge_assignments row
// to 'revoked' if one exists — this is the "cut off this judge's access"
// action, not just a cosmetic status change.
export async function revokeJudgeInvite(inviteId: number): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const { error } = await supabase.rpc('revoke_judge_invite', { p_invite_id: inviteId });
  if (error) return { success: false, error: friendlyManageError(error.message) };
  return { success: true };
}

// Mirrors src/store/judgeStore.js `deleteInvite()`: removes the invite row
// outright (for clearing duplicates/typos), leaving any judge/assignment it
// already produced untouched — distinct from revoke.
export async function deleteJudgeInvite(inviteId: number): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const { error } = await supabase.rpc('delete_judge_invite', { p_invite_id: inviteId });
  if (error) return { success: false, error: friendlyManageError(error.message) };
  return { success: true };
}

// Revokes an assigned judge's access directly (no pending invite row to key
// off of) by flipping judge_assignments.status — the same column/value the
// revoke_judge_invite RPC itself writes.
export async function revokeJudgeAssignment(assignmentId: string): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const { error } = await supabase.from('judge_assignments').update({ status: 'revoked' }).eq('id', assignmentId);
  if (error) return { success: false, error: friendlyManageError(error.message) };
  return { success: true };
}

function friendlyManageError(rawError?: string | null): string {
  if (!rawError) return 'Unable to complete this action right now. Please try again.';
  const message = rawError.toLowerCase();

  if (message.includes('organizer or admin access required') || message.includes('permission')) {
    return 'You do not have permission to manage judges for this event.';
  }
  if (message.includes('not found')) {
    return 'This invitation no longer exists. Refresh and try again.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  return 'Unable to complete this action right now. Please try again.';
}

function friendlyInviteError(rawError?: string | null): string {
  if (!rawError) return 'Unable to send the invitation right now. Please try again.';
  const message = rawError.toLowerCase();

  if (message.includes('already') && (message.includes('invite') || message.includes('assign'))) {
    return 'This judge has already been invited to this event.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  if (message.includes('permission') || message.includes('not authorized') || message.includes('403')) {
    return 'You do not have permission to invite judges for this event.';
  }

  return 'Unable to send the invitation right now. Please try again.';
}
