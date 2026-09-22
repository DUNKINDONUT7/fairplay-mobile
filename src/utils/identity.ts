// Ports src/utils/identity.js from the FairPlay web app byte-for-byte. The web
// app's `events.organizer_id` / `judges.id` columns are bigint, but Supabase
// Auth ids are uuid strings, so the web app hashes the uuid into a numeric
// "business id" with this exact algorithm. Mobile must reproduce it exactly,
// or querying `events` by the signed-in organizer's id would return nothing
// (or the wrong rows) compared to what the web app shows for the same user.
function normalizeIdentityValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function hashToSafeInteger(input: unknown): number | null {
  const text = normalizeIdentityValue(input);
  if (!text) return null;

  let hash = 17n;
  for (const char of text) {
    hash = (hash * 31n + BigInt(char.charCodeAt(0))) % 9007199254740000n;
  }

  return Number(hash || 1n);
}

export function getBusinessActorId(actor: unknown): number | null {
  if (actor === null || actor === undefined) return null;

  if (typeof actor === 'object') {
    const record = actor as Record<string, unknown>;

    if (record.businessId !== null && record.businessId !== undefined) {
      return getBusinessActorId(record.businessId);
    }

    if (record.id !== null && record.id !== undefined) {
      const directId = getBusinessActorId(record.id);
      if (directId !== null) {
        return directId;
      }
    }

    if (record.authProfileId) {
      const authProfileId = getBusinessActorId(record.authProfileId);
      if (authProfileId !== null) {
        return authProfileId;
      }
    }

    if (record.email) {
      return hashToSafeInteger(record.email);
    }

    return null;
  }

  if (typeof actor === 'number' && Number.isFinite(actor)) {
    return actor;
  }

  const normalized = normalizeIdentityValue(actor);
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return hashToSafeInteger(normalized);
}
