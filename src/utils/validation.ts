const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

// Same 8-char/upper/lower/number rule the web app's account settings page
// enforces for a password change (AccountCredentialsCard.jsx's
// passwordProblem) — applied here to every password a user sets (sign-up
// and change-password alike), not just the change-password screen.
export const PASSWORD_CHANGE_MIN_LENGTH = 8;

export type PasswordChecks = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
};

export type PasswordStrength = {
  checks: PasswordChecks;
  score: number;
  label: string;
  color: 'red' | 'amber' | 'blue' | 'green';
  percent: number;
  meetsAllChecks: boolean;
};

export function getPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    length: password.length >= PASSWORD_CHANGE_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const meetsAllChecks = score === 4;

  const levels: { label: string; color: PasswordStrength['color']; percent: number }[] = [
    { label: '', color: 'red', percent: 0 },
    { label: 'Weak', color: 'red', percent: 25 },
    { label: 'Fair', color: 'amber', percent: 50 },
    { label: 'Good', color: 'blue', percent: 75 },
    { label: 'Strong', color: 'green', percent: 100 },
  ];

  const level = levels[score];
  return { checks, score, meetsAllChecks, label: level.label, color: level.color, percent: level.percent };
}
