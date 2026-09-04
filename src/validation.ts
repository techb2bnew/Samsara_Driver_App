import { auth as t } from './constans/Constants';

/** Real mailbox shape: local@domain.tld — not just "something with an @". */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return t.signIn.emailRequired;
  if (!EMAIL_REGEX.test(email)) return t.signIn.emailInvalid;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return t.signIn.passwordRequired;
  if (value.length < PASSWORD_MIN_LENGTH) return t.signIn.passwordTooShort;
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return t.newPassword.passwordRequired;
  if (value.length < PASSWORD_MIN_LENGTH) return t.newPassword.tooShort;
}

export function validateConfirmPassword(
  password: string,
  confirm: string,
): string | undefined {
  if (!confirm) return t.newPassword.confirmRequired;
  if (confirm !== password) return t.newPassword.mismatch;
}
