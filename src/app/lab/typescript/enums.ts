import type { Equal, Expect } from '../shared/type-test';

/*
 * ENUM vs UNIONE DI LETTERALI vs OGGETTO `as const`.
 * Gli enum sono una delle poche feature TS che GENERANO codice JavaScript (insieme a namespace e
 * parameter properties): per questo non sono "type-only" e con `erasableSyntaxOnly` sono vietati.
 */

// ── Enum numerico: auto-incremento + reverse mapping ─────────────────────────
export enum Priority {
  Low, // 0
  Medium, // 1
  High = 10,
  Critical, // 11: continua da High
}

// ── Enum stringa: nessun reverse mapping, valori espliciti obbligatori ───────
export enum Status {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
}

// ── const enum: inline dei valori, niente oggetto a runtime (in teoria) ──────
// Con `isolatedModules` (attivo qui, come in ogni build Angular/esbuild) il compilatore lavora un file alla
// volta: un const enum IMPORTATO da un altro file non può essere inlinato, quindi viene trattato come
// enum normale (preserveConstEnums). Usarlo da un .d.ts ambient è un errore. In pratica: evitali.
const enum Direction {
  Up = 'UP',
  Down = 'DOWN',
}

// ── Alternative moderne ──────────────────────────────────────────────────────
/** Unione di letterali: zero runtime, stringhe semplici, perfetta con i template Angular. */
export type Theme = 'light' | 'dark' | 'system';

/** Oggetto `as const`: valori a runtime (iterabili) + tipo derivato. */
export const ROLE = {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Object.keys di un enum numerico contiene ANCHE le chiavi del reverse mapping. */
export function enumKeys(enumObject: object): string[] {
  return Object.keys(enumObject);
}

export function directionArrow(up: boolean): string {
  const direction = up ? Direction.Up : Direction.Down; // inlinato: 'UP' / 'DOWN'
  return direction === Direction.Up ? '↑ UP' : '↓ DOWN';
}

function enumChecks(): void {
  const reverse: string = Priority[Priority.High]; // 'High': solo per enum NUMERICI
  const fromNumber: Priority = 11; // ok: 11 è un valore dell'enum
  // @ts-expect-error da TS 5.0 un numero letterale che non è un membro dà errore
  const invalid: Priority = 42;

  // @ts-expect-error gli enum stringa sono NOMINALI: 'DRAFT' non è assegnabile a Status
  const fromString: Status = 'DRAFT';
  const theme: Theme = 'dark'; // l'unione di letterali accetta la stringa
  const role: Role = 'admin'; // anche il tipo derivato da as const

  // @ts-expect-error un const enum non ha oggetto: niente accesso per indice / reverse mapping
  Direction[0];

  type _ = [
    Expect<Equal<Role, 'admin' | 'editor' | 'viewer'>>,
    Expect<Equal<`${Status}`, 'DRAFT' | 'PUBLISHED'>>, // template literal: enum → unione di stringhe
    Expect<Equal<keyof typeof Priority, 'Low' | 'Medium' | 'High' | 'Critical'>>,
  ];
}
