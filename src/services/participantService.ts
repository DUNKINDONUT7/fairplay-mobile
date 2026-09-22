import { supabase } from '@/config/supabase';
import type { RegistrationRow } from '@/types/organizer';

// The web app keeps a cached `events.participants` count (updated by
// registrationStore.js on every registration) rather than a live COUNT query
// — mobile reads that same column so the number always matches web exactly,
// instead of risking a "web=24, mobile=21" drift from two different queries.
export async function fetchRegistrations(eventId: number): Promise<RegistrationRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RegistrationRow[];
}

export function subscribeToRegistrations(eventId: number, onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-registrations-${eventId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${eventId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
