import type { Equal, Expect } from '../shared/type-test';
import type { Account } from './type-operators';

/**
 * GENERICI: vincoli, default, inferenza dagli argomenti, `const` type parameter, varianza.
 */

// ---------------------------------------------------------------------------
// Vincolo con keyof: la chiave è legata all'oggetto, il ritorno è T[K]
// ---------------------------------------------------------------------------
export function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

type _getProp = Expect<Equal<ReturnType<typeof getProp<Account, 'address'>>, Account['address']>>;
// @ts-expect-error K deve estendere keyof Account
type _badKey = typeof getProp<Account, 'phone'>;

// ---------------------------------------------------------------------------
// Default dei type parameter (come i default degli argomenti, i default vanno IN FONDO)
// ---------------------------------------------------------------------------
export interface ApiResponse<T = unknown, E extends Error = Error> {
  readonly data?: T;
  readonly error?: E;
}
type _defaults = Expect<Equal<ApiResponse, ApiResponse<unknown, Error>>>;
// @ts-expect-error il default deve rispettare il vincolo (string non estende Error)
type _badDefault<E extends Error = string> = E;

// ---------------------------------------------------------------------------
// const type parameter (TS 5.0): inferisce come se il chiamante avesse scritto `as const`
// ---------------------------------------------------------------------------
export function defineTabs<const T extends readonly string[]>(tabs: T): T {
  return tabs;
}

export const TABS = defineTabs(['profilo', 'sicurezza', 'notifiche']);
type _constParam = Expect<Equal<typeof TABS, readonly ['profilo', 'sicurezza', 'notifiche']>>;
// senza `const` lo stesso argomento verrebbe inferito string[] (verificato nella spec)
export type Tab = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Varianza: `out` = covariante (solo output), `in` = controvariante (solo input)
// Le annotazioni sono CONTROLLATE dal compilatore e velocizzano i confronti.
// ---------------------------------------------------------------------------
interface Producer<out T> {
  get: () => T;
}
interface Consumer<in T> {
  accept: (value: T) => void;
}
interface Box<in out T> {
  get: () => T;
  set: (value: T) => void;
}

type Extends<A, B> = A extends B ? true : false;
type _covariant = Expect<Equal<Extends<Producer<'a'>, Producer<string>>, true>>;
type _contravariant = Expect<Equal<Extends<Consumer<string>, Consumer<'a'>>, true>>;
type _contravariantNo = Expect<Equal<Extends<Consumer<'a'>, Consumer<string>>, false>>;
type _invariant = Expect<Equal<Extends<Box<'a'>, Box<string>>, false>>;

// @ts-expect-error T compare in output: dichiararlo `in` è un errore
interface WrongProducer<in T> {
  get: () => T;
}

// Trappola: la sintassi METODO è bivariante anche con strictFunctionTypes, la sintassi PROPRIETÀ no
interface MethodHandler<T> {
  handle(value: T): void;
}
interface PropertyHandler<T> {
  handle: (value: T) => void;
}
type _methodBivariant = Expect<Equal<Extends<MethodHandler<'a'>, MethodHandler<string>>, true>>;
type _propertyStrict = Expect<Equal<Extends<PropertyHandler<'a'>, PropertyHandler<string>>, false>>;

// ---------------------------------------------------------------------------
// Inferenza da più argomenti
// ---------------------------------------------------------------------------
/** T è inferito da ENTRAMBI gli argomenti: `pair(1, 'x')` è un errore (vedi spec). */
export function pair<T>(first: T, second: T): readonly [T, T] {
  return [first, second];
}
type _pair = Expect<Equal<ReturnType<typeof pair<number>>, readonly [number, number]>>;

// controprova: la libreria di test fallisce davvero se i tipi differiscono
// @ts-expect-error string[] non è readonly ['profilo', …]
type _sanity = Expect<Equal<typeof TABS, string[]>>;
