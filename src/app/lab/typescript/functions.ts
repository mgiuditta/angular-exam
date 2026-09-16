import type { Equal, Expect } from '../shared/type-test';

/*
 * FUNZIONI: parametri opzionali/default/rest, tipi funzione, overload, `this`, assegnabilità di void.
 * GENERICI: vincoli, default, `const` type parameter (TS 5.0), `NoInfer` (TS 5.4).
 */

// ── Parametri ────────────────────────────────────────────────────────────────

/** Opzionale `?` (può mancare → string | undefined), default (tipo inferito dal valore), rest (sempre array). */
export function buildLabel(text: string, suffix?: string, separator = ' · ', ...tags: string[]): string {
  return [text, suffix, ...tags].filter(Boolean).join(separator);
}

// ── Tipi funzione ────────────────────────────────────────────────────────────

/** Type alias di funzione; equivalente come "call signature": `{ (a: number, b: number): number }`. */
export type Operation = (a: number, b: number) => number;

export const OPERATIONS = {
  somma: (a, b) => a + b, // parametri tipizzati dal contesto (contextual typing)
  prodotto: (a, b) => a * b,
  massimo: Math.max, // (...values: number[]) => number è compatibile
} satisfies Record<string, Operation>;

// ── Overload ─────────────────────────────────────────────────────────────────

/** Firme di overload (visibili ai chiamanti) + UNA implementazione (non chiamabile direttamente). */
export function parseInput(value: string): number;
export function parseInput(value: readonly string[]): number[];
export function parseInput(value: string | readonly string[]): number | number[] {
  return typeof value === 'string' ? Number(value) : value.map(Number);
}

// ── this come parametro ──────────────────────────────────────────────────────

export interface Counter {
  count: number;
}

/** `this: Counter` è un parametro FINTO: sparisce nel JS, serve solo a tipizzare `this`. */
export function describeCounter(this: Counter, label: string): string {
  return `${label}: ${this.count}`;
}

// ── Generici ─────────────────────────────────────────────────────────────────

/** Vincolo con extends: T deve avere length. Il tipo restituito resta quello PRECISO passato. */
export function longest<T extends { readonly length: number }>(a: T, b: T): T {
  return b.length > a.length ? b : a;
}

/** Default del type parameter: `Paginated` senza argomenti = `Paginated<string>`. */
export interface Paginated<T = string> {
  readonly items: readonly T[];
  readonly total: number;
}

/**
 * `const T`: inferisce come se il chiamante avesse scritto `as const` (letterali + tupla readonly).
 * `NoInfer<S>`: `initial` non partecipa all'inferenza di S → deve essere UNO degli stati già inferiti.
 */
export function createMachine<const S extends readonly string[]>(states: S, initial: NoInfer<S[number]>) {
  let current: S[number] = initial;
  return {
    states,
    current: () => current,
    next: (): S[number] => {
      current = states[(states.indexOf(current) + 1) % states.length];
      return current;
    },
  };
}

function functionChecks(counter: Counter): void {
  // @ts-expect-error `this` è di tipo void se la funzione non è chiamata come metodo di un Counter
  describeCounter('nudo');
  describeCounter.call(counter, 'con call');

  // @ts-expect-error l'implementazione non fa parte degli overload: string | string[] non è accettato
  parseInput(Math.random() > 0.5 ? '1' : ['1']);

  // void come tipo di ritorno di un TIPO funzione: il callback può restituire qualcosa, verrà ignorato.
  const numbers: number[] = [];
  const pushAll: (value: number) => void = (value) => numbers.push(value); // push ritorna number: ok
  [1, 2].forEach((n) => numbers.push(n)); // stessa regola: forEach vuole un callback `=> void`

  // @ts-expect-error meno parametri va bene, di più no: un Operation non accetta 3 argomenti
  const threeArgs: Operation = (a: number, b: number, c: number) => a + b + c;
  const oneArg: Operation = (a) => a; // ok: ignorare parametri è sempre sicuro

  // @ts-expect-error vincolo non rispettato: number non ha `length`
  longest(1, 2);

  const machine = createMachine(['idle', 'loading', 'done'], 'idle');
  // @ts-expect-error NoInfer: 'error' non allarga S, quindi non è uno stato valido
  createMachine(['idle', 'loading'], 'error');

  const longer = longest('ab', 'abc');
  const defaulted: Paginated = { items: ['a'], total: 1 };
  const explicit = longest<string>('ab', 'abc'); // type argument esplicito: niente letterali

  type _ = [
    Expect<Equal<Parameters<typeof buildLabel>, [text: string, suffix?: string, separator?: string, ...tags: string[]]>>,
    Expect<Equal<ReturnType<typeof parseInput>, number[]>>, // con gli overload, ReturnType usa l'ULTIMA firma
    Expect<Equal<typeof longer, 'ab' | 'abc'>>, // T compare "nudo" nel ritorno → i letterali non si allargano
    Expect<Equal<typeof defaulted.items, readonly string[]>>,
    Expect<Equal<typeof explicit, string>>,
    Expect<Equal<typeof machine.states, readonly ['idle', 'loading', 'done']>>, // grazie a `const T`
    Expect<Equal<ReturnType<typeof machine.next>, 'idle' | 'loading' | 'done'>>,
    Expect<Equal<ReturnType<typeof pushAll>, void>>,
  ];
}
