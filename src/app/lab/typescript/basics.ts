import type { Equal, Expect } from '../shared/type-test';

/*
 * FONDAMENTA: primitivi, any/unknown/never/void, null e undefined, object/{}/Object,
 * letterali e widening, as const, satisfies, operatori ?. ?? ??= ||= &&=.
 *
 * Ogni affermazione è verificata dal compilatore con `Expect<Equal<…>>` o `// @ts-expect-error`:
 * se la riga NON desse errore, sarebbe la direttiva stessa a far fallire la build.
 * Le righe che darebbero errore stanno in funzioni mai chiamate: servono solo al type checker.
 */

// ── any, unknown, never, void ────────────────────────────────────────────────

/** never: la funzione non ritorna MAI (lancia o cicla). È il "bottom type": assegnabile a qualsiasi tipo. */
export function fail(message: string): never {
  throw new Error(message);
}

/** unknown → narrowing con typeof. Nota `typeof null === 'object'`. */
export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array di ${value.length} elementi`; // any[] → meglio unknown[] a mano
  switch (typeof value) {
    case 'string':
      return `string di ${value.length} caratteri`; // qui value: string
    case 'number':
      return Number.isNaN(value) ? 'number (NaN!)' : `number ${value.toFixed(2)}`;
    case 'bigint':
      return `bigint ${value}n`;
    case 'boolean':
      return `boolean ${value ? 'vero' : 'falso'}`;
    case 'undefined':
      return 'undefined';
    case 'object':
      return `object con chiavi: ${Object.keys(value).join(', ') || 'nessuna'}`; // value: object (null escluso sopra)
    default:
      return typeof value; // 'symbol' | 'function'
  }
}

function topAndBottomTypes(fromAny: any, fromUnknown: unknown): void {
  const contagious = fromAny.qualsiasi.cosa; // any "spegne" il type checker e si propaga
  // @ts-expect-error unknown non permette operazioni finché non lo restringi
  fromUnknown.qualsiasi;

  const toNumber: number = fromAny; // any è assegnabile a tutto…
  // @ts-expect-error …unknown solo a unknown e any
  const unknownToNumber: number = fromUnknown;

  // @ts-expect-error bigint e number non si mescolano
  const mixed = 10n + toNumber;

  type _ = [
    Expect<Equal<typeof contagious, any>>,
    Expect<Equal<ReturnType<typeof fail>, never>>,
    Expect<Equal<string | never, string>>, // never sparisce nelle unioni
    Expect<Equal<string | unknown, unknown>>, // unknown assorbe le unioni
    Expect<Equal<string & unknown, string>>, // …e sparisce nelle intersezioni
  ];
}

// @ts-expect-error una funzione DICHIARATA `: void` non può restituire un valore
function declaredVoid(): void { return 42; }

// ── null / undefined con strictNullChecks ────────────────────────────────────

function strictNulls(): void {
  // @ts-expect-error con strict, null non è assegnabile a string
  const noNull: string = null;
  const maybe: string | undefined = undefined;
  // @ts-expect-error prima va escluso undefined (narrowing, ?. o ??)
  maybe.length;
}

// ── object vs {} vs Object ───────────────────────────────────────────────────

function objectTypes(): void {
  const emptyAcceptsPrimitives: {} = 42; // {} = "qualsiasi valore non nullish"
  // @ts-expect-error {} esclude solo null e undefined
  const emptyRejectsNull: {} = null;
  const objectAcceptsArrays: object = [1, 2];
  // @ts-expect-error object = solo NON primitivi (oggetti, array, funzioni)
  const objectRejectsPrimitives: object = 42;
  // @ts-expect-error Object (wrapper) controlla i membri di Object.prototype: toString deve essere una funzione
  const wrapperChecksMembers: Object = { toString: 1 };
}

// ── Letterali, widening, as const ────────────────────────────────────────────

function widening(): void {
  let widened = 'ciao'; // let → string
  const literal = 'ciao'; // const → 'ciao'
  const obj = { mode: 'dark', size: 2 }; // proprietà mutabili → widening
  const frozen = { mode: 'dark', size: 2 } as const; // readonly + letterali, in profondità
  const tuple = ['a', 1] as const;
  const array = ['a', 1];

  type _ = [
    Expect<Equal<typeof widened, string>>,
    Expect<Equal<typeof literal, 'ciao'>>,
    Expect<Equal<typeof obj, { mode: string; size: number }>>,
    Expect<Equal<typeof frozen, { readonly mode: 'dark'; readonly size: 2 }>>,
    Expect<Equal<typeof tuple, readonly ['a', 1]>>,
    Expect<Equal<typeof array, (string | number)[]>>,
  ];

  // @ts-expect-error il tipo letterale accetta solo quel valore
  const onlyCiao: typeof literal = 'altro';
  // @ts-expect-error as const rende tutto readonly
  frozen.mode = 'light';
}

// ── satisfies vs annotazione vs as ───────────────────────────────────────────

export interface Theme {
  readonly background: string;
  readonly foreground: string;
  readonly radius: number | 'full';
}

/** satisfies VERIFICA la forma ma MANTIENE il tipo inferito: chiavi esatte e letterali. */
export const THEMES = {
  chiaro: { background: '#ffffff', foreground: '#111827', radius: 8 },
  scuro: { background: '#111827', foreground: '#f9fafb', radius: 'full' },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;

function satisfiesVsAnnotation(): void {
  const annotated: Record<string, Theme> = THEMES; // annotazione: il tipo è quello dichiarato
  const asserted = { background: '#fff' } as Theme; // `as`: nessun errore anche se mancano proprietà!

  // @ts-expect-error satisfies controlla la forma: 'rotondo' non è number | 'full'
  const wrong = { background: '#000', foreground: '#fff', radius: 'rotondo' } satisfies Theme;
  // @ts-expect-error con l'annotazione `annotated.qualsiasi` è Theme, ma con noPropertyAccessFromIndexSignature va letto con ['…']
  annotated.qualsiasi;

  type _ = [
    Expect<Equal<ThemeName, 'chiaro' | 'scuro'>>,
    Expect<Equal<typeof THEMES.scuro.radius, 'full'>>, // letterale preservato dal tipo contestuale
    Expect<Equal<typeof THEMES.chiaro.radius, number>>,
    Expect<Equal<keyof typeof annotated, string>>, // chiavi perse
    Expect<Equal<typeof asserted, Theme>>,
  ];
}

// ── Operatori: ?. ?? ??= ||= &&= ─────────────────────────────────────────────

export type Falsyish = 0 | '' | false | null | undefined | 'testo';

/** `||` scarta TUTTI i falsy (0, '', false, NaN); `??` solo null e undefined. */
export function fallbacks(value: Falsyish): { readonly or: string; readonly nullish: string } {
  return { or: String(value || 'default'), nullish: String(value ?? 'default') };
}

export interface Settings {
  pageSize?: number;
  title?: string;
  user?: { name: string } | null;
}

/** Assegnazioni logiche su una COPIA (niente mutazione dell'input). */
export function normalizeSettings(input: Readonly<Settings>): Settings {
  const settings = { ...input };
  settings.pageSize ??= 20; // solo se null/undefined → 0 resta 0
  settings.title ||= 'Senza titolo'; // se falsy → '' diventa 'Senza titolo'
  settings.user &&= { name: settings.user.name.trim() }; // solo se truthy
  return settings;
}

/** `?.` interrompe la catena su null/undefined e restituisce undefined. */
export function userInitial(settings: Readonly<Settings>): string {
  const initial = settings.user?.name.at(0)?.toUpperCase();
  type _ = Expect<Equal<typeof initial, string | undefined>>;
  return initial ?? '—';
}
