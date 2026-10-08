import { supabase } from '@/config/supabase';
import { audienceAttendanceQRValue } from '@/services/qrService';
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

// For roster entries with no registrations row at all (organizer-added via
// "Add Participant" / CSV import on web — events.contestants only, see
// handleAddContestant/handleBulkImportCsv in OrganizerEventDetail.jsx), the
// contestant id IS the attendee id directly, with no qrToken to fall back on.
export function isAttendeeCheckedIn(attendeeId: string, attendanceRows: AttendanceRow[]): boolean {
  return attendanceRows.some((row) => row.attendee_id === attendeeId);
}

export function attendeeCheckedInAt(attendeeId: string, attendanceRows: AttendanceRow[]): string | null {
  return attendanceRows.find((row) => row.attendee_id === attendeeId)?.checked_in_at || null;
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
  scannerId,
}: {
  event: EventRow;
  registration: RegistrationRow;
  qrToken: string;
  scannerId?: string | null;
}): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  // attendance.id is text with no default/identity (confirmed live: inserting
  // without it fails "null value in column id violates not-null constraint"),
  // so it must be generated client-side — same <prefix>-<timestamp>-<suffix>
  // shape already seen on real qrToken values (e.g.
  // "participant-1790399825129-30trumpo"), for consistency with the rest of
  // this schema's text ids.
  const id = `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const { error } = await supabase.from('attendance').insert({
    id,
    event_id: event.id,
    attendee_id: attendeeIdFor(registration),
    attendee_name: registration.team_name || registration.participant_name,
    attendee_type: 'participant',
    role: 'participant',
    check_in_status: 'checked-in',
    scanner_id: scannerId || null,
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

// Records a general-audience attendance scan — no registration, no account,
// just a name. Writes to the same `attendance` table as checkInParticipant,
// but attendee_type/role are 'audience' — attendee_type specifically is what
// the web Attendance page groups rows by into its "Audience Attendance"
// table; leaving it unset silently defaulted to 'participant' (confirmed
// live via the Supabase table editor). Also bumps events.audience_attendance,
// the same cached-counter pattern already used for events.participants.
export async function checkInAudienceMember({ event, name }: { event: EventRow; name: string }): Promise<ActionResult> {
  if (!supabase) return { success: false, error: 'Supabase is not configured yet.' };

  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: 'Please enter your name.' };

  const id = `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const attendeeId = `audience-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error } = await supabase.from('attendance').insert({
    id,
    event_id: event.id,
    attendee_id: attendeeId,
    attendee_name: trimmedName,
    attendee_type: 'audience',
    role: 'audience',
    check_in_status: 'checked-in',
    scanner_id: null,
    checked_in_at: new Date().toISOString(),
    qr_token: audienceAttendanceQRValue(event),
    source: 'mobile',
  });

  if (error) {
    console.warn('checkInAudienceMember insert failed:', error);
    return { success: false, error: `Unable to record your attendance: ${error.message}` };
  }

  await supabase
    .from('events')
    .update({ audience_attendance: (event.audience_attendance || 0) + 1 })
    .eq('id', event.id);

  return { success: true };
}
