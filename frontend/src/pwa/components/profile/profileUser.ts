import type { User } from '../../../shared/types';

export function getFullName(user: User): string {
  return `${user.first_name} ${user.last_name}`.trim();
}

export function getInitials(user: User): string {
  return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
}

/** Keeps enough of the address to recognize it without printing it in full. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
}
