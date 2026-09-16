import type { Equal, Expect } from '../shared/type-test';

/**
 * MAPPED TYPES: `{ [K in Chiavi]: Valore }`, modificatori, rimappatura con `as`, filtro con `never`.
 */

export interface Employee {
  readonly id: number;
  name: string;
  team: 'frontend' | 'backend' | 'design';
  seniority: number;
  remote: boolean;
  manager?: string;
}

// ---------------------------------------------------------------------------
// Modificatori: +readonly / -readonly, +? / -? (il `+` è implicito)
// ---------------------------------------------------------------------------
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Frozen<T> = { +readonly [K in keyof T]+?: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };

type _mutable = Expect<Equal<Mutable<{ readonly a: 1 }>, { a: 1 }>>;
type _frozen = Expect<Equal<Frozen<{ a: 1 }>, { readonly a?: 1 }>>;
type _concrete = Expect<Equal<Concrete<{ a?: 1 }>, { a: 1 }>>;

// OMOMORFO (`K in keyof T`) → conserva i modificatori; su array/tuple produce array/tuple
type Copy<T> = { [K in keyof T]: T[K] };
type _homomorphic = Expect<Equal<Copy<{ readonly a?: 1 }>, { readonly a?: 1 }>>;
type _tuple = Expect<Equal<Mutable<readonly [1, 2]>, [1, 2]>>;
// NON omomorfo (chiavi da un'union qualsiasi) → modificatori persi
type FromKeys<T> = { [K in 'a']: K extends keyof T ? T[K] : never };
type _notHomomorphic = Expect<Equal<FromKeys<{ readonly a?: 1 }>, { a: 1 | undefined }>>;

// ---------------------------------------------------------------------------
// Rimappatura delle chiavi con `as` (TS 4.1): rinominare, filtrare (`never` = scarta)
// ---------------------------------------------------------------------------
// `keyof T & string`: le chiavi possono essere number/symbol, Capitalize vuole string
export type Getters<T> = { [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K] };
type _getters = Expect<Equal<Getters<{ name: string; age: number }>, { getName: () => string; getAge: () => number }>>;

type WithoutKey<T, Removed extends PropertyKey> = { [K in keyof T as Exclude<K, Removed>]: T[K] };
type _withoutKey = Expect<Equal<WithoutKey<{ id: 1; name: 'x' }, 'id'>, { name: 'x' }>>;

/** Filtro sul TIPO DEL VALORE: tiene solo le proprietà con valore assegnabile a V. */
export type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
type _pickByValue = Expect<Equal<PickByValue<Employee, number>, { readonly id: number; seniority: number }>>;

/**
 * Chiavi il cui valore estende V. Pattern "mappa e indicizza": `{ [K in keyof T]: … }[keyof T]`.
 * `-?` serve: con proprietà opzionali l'indicizzazione aggiungerebbe `undefined` all'union.
 */
export type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
type _keysOfString = Expect<Equal<KeysOfType<Employee, string>, 'name' | 'team'>>;
type _keysOfNumber = Expect<Equal<KeysOfType<Employee, number>, 'id' | 'seniority'>>;
// `manager?: string` vale `string | undefined` → non estende string (e senza -? comparirebbe undefined)
type _optionalValue = Expect<Equal<KeysOfType<Employee, string | undefined>, 'name' | 'team' | 'manager'>>;

type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
type _optionalKeys = Expect<Equal<OptionalKeys<Employee>, 'manager'>>;

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
/**
 * Raggruppa per una chiave con valore string/number.
 * Limite noto: dentro la funzione TS NON deduce che `item[key]` sia PropertyKey
 * (non ragiona su T[KeysOfType<T, V>] generico) → serve l'intersezione `& PropertyKey`.
 */
export function groupBy<T, K extends KeysOfType<T, string | number>>(
  items: readonly T[],
  key: K,
): Partial<Record<T[K] & PropertyKey, T[]>> {
  const groups: Partial<Record<T[K] & PropertyKey, T[]>> = {};
  for (const item of items) {
    const group = item[key] as T[K] & PropertyKey;
    (groups[group] ??= []).push(item);
  }
  return groups;
}

/** Object.entries perde le chiavi (string) e i valori: il cast finale è il prezzo del runtime dinamico. */
export function toGetters<T extends object>(obj: T): Getters<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [`get${key.charAt(0).toUpperCase()}${key.slice(1)}`, () => value]),
  ) as Getters<T>;
}
