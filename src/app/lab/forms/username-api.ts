import { Observable, map, timer } from 'rxjs';

const TAKEN_USERNAMES = ['admin', 'angular', 'root'];

/**
 * Finta API "username già usato?" (cold Observable, completa dopo `delayMs`).
 * Usata sia dal validator asincrono dei reactive forms sia da `validateAsync` dei Signal Forms.
 */
export function isUsernameTaken(username: string, delayMs = 800): Observable<boolean> {
  const normalized = username.trim().toLowerCase();
  return timer(delayMs).pipe(map(() => TAKEN_USERNAMES.includes(normalized)));
}
