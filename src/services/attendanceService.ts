import { supabase } from '@/config/supabase';
import type { AttendanceRow, EventRow, RegistrationRow } from '@/types/organizer';

export async function fetchAttendanceForEvent(eventId: number): Promise<AttendanceRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from('attendance').select('*').eq('event_id', eventId);

  if (error) throw error;
  return (data || []) as AttendanceRow[];
}

export async function fetchAttendanceForEvents(eventIds: number[]): Promise<AttendanceRow[]> {
  if (!supabase || eventIds.length === 0) return [];

  const { data, error } = await supabase.from('attendance').select('*').in('event_id', eventIds);

  if (error) throw error;
  return (data || []) as AttendanceRow[];
}

export function subscribeToAttendance(eventId: number, onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-attendance-${eventId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// The contestant-id string already used elsewhere for this registration
// (events.contestants[].id / scores.contestant_id — see registerForEvent in
// participantService.ts), which is what attendance.attendee_id matches.
function attendeeIdFor(registration: RegistrationRow): string {
  const participantId = (registration.metadata as { participantId?: string } | null | undefined)?.participantId;
  return participantId || String(registration.id);
}

function findAttendanceRow(registration: RegistrationRow, attendanceRows: AttendanceRow[]): AttendanceRow | undefined {
  const qrToken = registration.individual_details?.qrToken;
  const attendeeId = attendeeIdFor(registration);

  return attendanceRows.find(
    (row) => (qrToken && row.qr_token === qrToken) || row.attendee_id === attendeeId
  );
}

export function isCheckedIn(registration: RegistrationRow, attendanceRows: AttendanceRow[]): boolean {
  return Boolean(findAttendanceRow(registration, attendanceRows));
}

export function checkedInAt(registration: RegistrationRow, attendanceRows: AttendanceRow[]): string | null {
  return findAttendanceRow(registration, attendanceRows)?.checked_in_at || null;
}

// Finds which registration a scanned QR value belongs to. The scanned value
// IS the registration's individual_details.qrToken directly (no wrapper
// format) — see qrService.ts's removed participantCheckInQRValue for why.
export function findRegistrationByQrToken(qrToken: string, registrations: RegistrationRow[]): RegistrationRow | undefined {
  return registrations.find((row) => row.individual_details?.qrToken === qrToken);
}

type ActionResult = { success: boolean; error?: string };

// Writes to the SAME `attendance` table the web app's own attendance view
// reads (confirmed against the live schema, since it isn't in this repo) —
// previously this stamped registrations.metadata instead, which the web
// attendance page never looked at, so mobile check-ins never showed up there.
export async function checkInParticipant({
  event,
  registration,
  qrToken,
}: {
  event: EventRow;
  registration: RegistrationRow;
  qrToken: string;
}): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const { error } = await supabase.from('attendance').insert({
    event_id: event.id,
    attendee_id: attendeeIdFor(registration),
    attendee_name: registration.team_name || registration.participant_name,
    role: 'participant',
    checked_in_at: new Date().toISOString(),
    qr_token: qrToken,
    source: 'mobile',
  });

  if (error) {
    console.warn('checkInParticipant insert failed:', error);
    return { success: false, error: `Unable to check in this participant: ${error.message}` };
  }
  return { success: true };
}
