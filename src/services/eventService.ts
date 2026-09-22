import { supabase } from '@/config/supabase';
import { getBusinessActorId } from '@/utils/identity';
import type { EventRow } from '@/types/organizer';

// Mirrors src/store/eventStore.js `fetchEvents(organizerId)` on the web app:
// events.organizer_id is a numeric "business id" derived from the signed-in
// user's auth uuid (see utils/identity.ts), not the uuid itself.
export async function fetchOrganizerEvents(authUserId: string): Promise<EventRow[]> {
  if (!supabase) return [];

  const organizerId = getBusinessActorId(authUserId);
  if (organizerId === null) return [];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as EventRow[];
}

export async function fetchEventById(eventId: number): Promise<EventRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();

  if (error) throw error;
  return (data as EventRow) || null;
}

export function subscribeToOrganizerEvents(onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-events-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export function eventDisplayDate(event: EventRow): string {
  const raw = event.start_date || event.scheduled_date;
  if (!raw) return 'Date TBD';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Date TBD';

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function eventStatusLabel(status?: string | null): string {
  if (!status) return 'Draft';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
