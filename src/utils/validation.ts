const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

// Matches Supabase Auth's default minimum password length.
export const MIN_PASSWORD_LENGTH = 6;
