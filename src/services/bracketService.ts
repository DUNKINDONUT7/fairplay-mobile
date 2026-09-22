import { supabase } from '@/config/supabase';
import type { TournamentRow } from '@/types/organizer';

// Mirrors src/store/tournamentStore.js on the web app. Brackets are NOT a
// separate brackets/matches table pair (that pair exists in the schema but
// is unused) — a bracket is a row on `tournaments`, with its matches stored
// as a jsonb array in the `matches` column. Read-only on mobile: bracket
// generation/editing stays a web workflow, mobile is for monitoring.
export async function fetchTournaments(eventId: number): Promise<TournamentRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TournamentRow[];
}

export function subscribeToTournaments(eventId: number, onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-tournaments-${eventId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
