import { supabase } from '@/config/supabase';
import type { JudgeAssignment, JudgeInviteRow } from '@/types';
import type { EventRow } from '@/types/organizer';

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

  // Real Postgres columns are snake_case (title/type/start_date/...) — cast
  // to EventRow, the type that already matches the schema everywhere else in
  // this app, not the legacy camelCase EventSummary type that never matched
  // what Supabase actually returns.
  const events = (eventsRes.data || []) as EventRow[];
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
