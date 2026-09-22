import { supabase } from '@/config/supabase';

type ActivityMessage = { title: string; body: string };

// Watches registrations / judge_invites / scores for INSERT/UPDATE activity
// and reports anything that belongs to one of the organizer's own events
// (checked client-side via getEventIds, since Postgres realtime filters only
// support a single column=value match, not "IN (...)"). Matches the broad
// "subscribe to the whole table, filter in the callback" pattern the web app
// itself already uses (src/utils/supabaseClient.js subscribeToTable).
export function subscribeToOrganizerActivity(getEventIds: () => Set<number>, onActivity: (message: ActivityMessage) => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-organizer-activity-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, (payload) => {
      const row = payload.new as { event_id?: number; participant_name?: string; team_name?: string };
      if (!row.event_id || !getEventIds().has(row.event_id)) return;

      onActivity({
        title: 'New registration',
        body: `${row.team_name || row.participant_name || 'Someone'} just registered for your event.`,
      });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'judge_invites' }, (payload) => {
      const row = payload.new as { event_id?: number; status?: string; judge_name?: string };
      if (row.status !== 'claimed' || !row.event_id || !getEventIds().has(row.event_id)) return;

      onActivity({
        title: 'Judge invitation accepted',
        body: `${row.judge_name || 'A judge'} accepted your invitation.`,
      });
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores' }, (payload) => {
      const row = payload.new as { event_id?: number; judge_name?: string; contestant_name?: string };
      if (!row.event_id || !getEventIds().has(row.event_id)) return;

      onActivity({
        title: 'New score submitted',
        body: `${row.judge_name || 'A judge'} scored ${row.contestant_name || 'a participant'}.`,
      });
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
