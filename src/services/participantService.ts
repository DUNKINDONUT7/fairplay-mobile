import { supabase } from '@/config/supabase';
import type { EventRow, RegistrationRow } from '@/types/organizer';

type RegisterResult = { success: boolean; error?: string };

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

// Mirrors src/pages/participant/ParticipantDashboard.jsx isMyRegistration —
// registrations have no foreign key to auth.users, so "my registrations" is
// matched by email first, falling back to an exact participant-name match.
export async function fetchAllRegistrations(): Promise<RegistrationRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RegistrationRow[];
}

export function isMyRegistration(registration: RegistrationRow, email?: string | null, fullName?: string | null): boolean {
  const regEmail = String(registration.email || '').trim().toLowerCase();
  const userEmail = String(email || '').trim().toLowerCase();
  if (regEmail && userEmail && regEmail === userEmail) return true;

  const participantName = String(registration.participant_name || '').trim().toLowerCase();
  const userName = String(fullName || '').trim().toLowerCase();
  return Boolean(participantName && userName && participantName === userName);
}

// Mirrors src/store/registrationStore.js's individual-registration path
// (id/participantId generation, contestants side effect) so an event
// registered from mobile is indistinguishable from one registered on web —
// same registrations row shape, and the same events.participants /
// events.contestants bump the organizer's dashboard stat tiles read.
export async function registerForEvent({
  event,
  participantName,
  email,
  category,
}: {
  event: EventRow;
  participantName: string;
  email: string;
  category?: string;
}): Promise<RegisterResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const trimmedName = participantName.trim();
  const trimmedEmail = email.trim();

  if (event.max_participants && (event.participants || 0) >= event.max_participants) {
    return { success: false, error: 'This event has reached its participant capacity.' };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('registrations')
    .select('id, participant_name, email')
    .eq('event_id', event.id);

  if (fetchError) return { success: false, error: 'Unable to check existing registrations. Please try again.' };

  const alreadyRegistered = (existing || []).some((registration) => {
    const sameEmail = trimmedEmail && String(registration.email || '').trim().toLowerCase() === trimmedEmail.toLowerCase();
    const sameName = String(registration.participant_name || '').trim().toLowerCase() === trimmedName.toLowerCase();
    return sameEmail || sameName;
  });

  if (alreadyRegistered) {
    return { success: false, error: 'You are already registered for this event.' };
  }

  const registrationId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const participantId = `participant-${registrationId}`;

  const { error: insertError } = await supabase.from('registrations').insert({
    id: registrationId,
    event_id: event.id,
    participant_id: null,
    participant_name: trimmedName,
    email: trimmedEmail || null,
    category: category?.trim() || null,
    status: 'submitted',
    registration_type: 'individual',
    individual_details: { name: trimmedName, email: trimmedEmail, phone: '', qrToken: `qr-${registrationId}` },
    metadata: { participantId },
  });

  if (insertError) return { success: false, error: 'Unable to submit your registration. Please try again.' };

  const contestants = Array.isArray(event.contestants) ? event.contestants : [];
  const nextContestants = [...contestants, { id: participantId, name: trimmedName, type: 'participant', email: trimmedEmail }];

  await supabase
    .from('events')
    .update({ contestants: nextContestants, participants: nextContestants.length })
    .eq('id', event.id);

  return { success: true };
}

export function subscribeToAllRegistrations(onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-my-registrations-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
