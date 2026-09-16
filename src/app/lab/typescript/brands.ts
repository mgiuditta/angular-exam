import type { Equal, Expect } from '../shared/type-test';

/*
 * TIPI NOMINALI in un sistema strutturale: `unique symbol` e branded types.
 * Due `string` sono sempre compatibili; un brand li distingue SOLO a compile time (a runtime resta una stringa).
 */

// ── unique symbol ────────────────────────────────────────────────────────────

/** `unique symbol` è un sottotipo di symbol legato a UNA dichiarazione: richiede `const` o `static readonly`. */
export const ROLE_KEY: unique symbol = Symbol('role');

export interface WithRole {
  readonly [ROLE_KEY]: string; // chiave simbolo: non collide con nessuna stringa, non esce in JSON.stringify
}

// ── Branded types ────────────────────────────────────────────────────────────

/** Il brand usa un `unique symbol` dichiarato SOLO come tipo (`declare`): nessun codice generato. */
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Email = Brand<string, 'Email'>;
export type UserId = Brand<number, 'UserId'>;

/** "Smart constructor": l'unico punto dove si usa `as`, DOPO la validazione. */
export function toEmail(value: string): Email | null {
  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? (trimmed as Email) : null;
}

/** Accetta solo email già validate: una string qualunque non compila. */
export function welcomeMessage(to: Email): string {
  return `Benvenuto! Abbiamo scritto a ${to}`; // Email resta usabile come string
}

function brandChecks(email: Email, id: UserId): void {
  // @ts-expect-error una string qualunque non è un'Email: va passata da toEmail()
  welcomeMessage('ada@example.com');
  // @ts-expect-error brand diversi non sono compatibili anche se la base è la stessa
  const wrong: UserId = 42;
  const asString: string = email; // verso il tipo base: sempre ok
  const sum = id + 1; // gli operatori funzionano, ma il risultato perde il brand

  // @ts-expect-error unique symbol richiede una dichiarazione const
  let notUnique: unique symbol = Symbol('x');

  type _ = [
    Expect<Equal<typeof sum, number>>,
    Expect<Equal<Email extends string ? true : false, true>>,
  ];
}
