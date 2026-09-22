import { supabase } from '@/config/supabase';
import type { EventSummary, JudgeAssignment, JudgeInviteRow } from '@/types';

export async function fetchMobileData() {
  if (!supabase) {
    return { events: [], assignments: [], invites: [] };
  }

  const [eventsRes, assignmentsRes, invitesRes] = await Promise.all([
    supabase.from('events').select('*').order('created_at', { ascending: false }),
    supabase.from('judge_assignments').select('*').order('assigned_at', { ascending: false }),
    supabase.from('judge_invites').select('*').order('created_at', { ascending: false }),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (invitesRes.error) throw invitesRes.error;

  const events = (eventsRes.data || []) as EventSummary[];
  const assignments = (assignmentsRes.data || []) as JudgeAssignment[];
  const invites = (invitesRes.data || []) as JudgeInviteRow[];

  return { events, assignments, invites };
}

export function subscribeToFairplayRealtime(onChange: () => void) {
  const client = supabase;

  if (!client) return () => {};

  const channel = client.channel('fairplay-mobile-realtime');

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_assignments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_invites' }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
