// Maps raw Supabase/network error strings to short, user-friendly messages.
// Falls back to the raw message when nothing matches, so unanticipated errors
// are still visible rather than silently hidden.
export function friendlyAuthError(rawError?: string | null): string {
  if (!rawError) return 'Something went wrong. Please try again.';

  const message = rawError.toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('already registered') || message.includes('user already exists')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (message.includes('password should be at least') || message.includes('password is too short')) {
    return 'Password is too short. Please use a longer password.';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (message.includes('network request failed') || message.includes('fetch') || message.includes('timeout')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  return rawError;
}
