// Mirrors src/utils/appUrl.js `buildAppUrl()` on the web app. Mobile has no
// window.location to fall back to, so it falls back to the same production
// URL the web app's own Edge Functions fall back to
// (supabase/functions/notify-judge-invite, notify-organizer-approval).
const FALLBACK_APP_URL = 'https://fairplay-kappa.vercel.app';

function baseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_APP_URL;
  const trimmed = configured?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : FALLBACK_APP_URL;
}

export function buildAppUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl()}${normalizedPath}`;
}

// Same destination the web Organizer's event-detail QR encodes
// (src/pages/organizer/OrganizerEventDetail.jsx) — public route, no token,
// so scanning it opens the same participant registration form the web app's
// own QR opens.
export function participantRegistrationQRValue(eventId: number): string {
  return buildAppUrl(`/participant/register?eventId=${eventId}`);
}

// Same destination as the web Organizer's "Judge Access" QR — public route
// keyed by eventId only (distinct from the emailed per-invite token link).
export function judgeAccessQRValue(eventId: number): string {
  return buildAppUrl(`/judge/open/${eventId}`);
}

// Identifies an already-submitted registration for in-app, on-site attendance
// check-in — scanned by an organizer/judge's camera inside the app, not opened
// in a browser, so unlike the other QR values here this is a plain token
// rather than a web URL.
export function participantCheckInQRValue(registrationId: number): string {
  return `fairplay-checkin:${registrationId}`;
}

export function parseCheckInQRValue(value: string): number | null {
  const match = /^fairplay-checkin:(\d+)$/.exec(value.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

// Same public event page the web app links to from PublicEventNav — no
// login required, and it reads the same live events/tournaments/scores data
// as the organizer's own dashboards, so spectators always see accurate,
// real-time results. Its own in-page nav links to the leaderboard and
// bracket views too, so a single QR covers all three.
export function spectatorViewQRValue(eventId: number): string {
  return buildAppUrl(`/events/${eventId}`);
}
