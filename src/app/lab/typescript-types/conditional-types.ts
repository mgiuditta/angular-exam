import type { Equal, Expect } from '../shared/type-test';

/**
 * CONDITIONAL TYPES: `T extends U ? X : Y`, distribuzione sulle union, `infer`, ricorsione.
 */

// ---------------------------------------------------------------------------
// Base: il test è l'ASSEGNABILITÀ, non l'uguaglianza
// ---------------------------------------------------------------------------
type IsString<T> = T extends string ? true : false;
type _literal = Expect<Equal<IsString<'ciao'>, true>>;
type _number = Expect<Equal<IsString<number>, false>>;

// ---------------------------------------------------------------------------
// Distribuzione: se T è un parametro "nudo" e riceve un'union, il ternario gira su OGNI membro
// ---------------------------------------------------------------------------
type ToArray<T> = T extends unknown ? T[] : never;
type _distributive = Expect<Equal<ToArray<string | number>, string[] | number[]>>;
// boolean = true | false → distribuisce anche lui
type _boolean = Expect<Equal<ToArray<boolean>, false[] | true[]>>;
// union vuota: never distribuito su zero membri = never (non false!)
type _never = Expect<Equal<IsString<never>, never>>;
// union mista: il risultato è a sua volta un'union
type _mixed = Expect<Equal<IsString<'a' | 1>, boolean>>;

// Disattivare la distribuzione: avvolgere ENTRAMBI i lati in una tupla
type ToArrayNonDistributive<T> = [T] extends [unknown] ? T[] : never;
type IsStringStrict<T> = [T] extends [string] ? true : false;
type _nonDistributive = Expect<Equal<ToArrayNonDistributive<string | number>, (string | number)[]>>;
type _strictMixed = Expect<Equal<IsStringStrict<'a' | 1>, false>>;
// `[never] extends [string]` è true: never è assegnabile a tutto
type _strictNever = Expect<Equal<IsStringStrict<never>, true>>;

// La distribuzione avviene SOLO sul parametro nudo: `T[] extends …` o `Box<T> extends …` non distribuiscono
type WrappedCheck<T> = T[] extends string[] ? true : false;
type _wrapped = Expect<Equal<WrappedCheck<'a' | 1>, false>>;

// ---------------------------------------------------------------------------
// infer: "cattura" un pezzo del tipo nel ramo true
// ---------------------------------------------------------------------------
type ElementType<T> = T extends readonly (infer E)[] ? E : never;
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type PromiseValue<T> = T extends Promise<infer V> ? V : T;

type _element = Expect<Equal<ElementType<readonly ('a' | 'b')[]>, 'a' | 'b'>>;
type _head = Expect<Equal<Head<[1, 2, 3]>, 1>>;
type _last = Expect<Equal<Last<[1, 2, 3]>, 3>>;
type _emptyHead = Expect<Equal<Head<[]>, never>>;
type _promise = Expect<Equal<PromiseValue<Promise<string>>, string>>;

// infer con vincolo (TS 4.7): `infer X extends string` → cattura SOLO se compatibile
type FirstIfString<T> = T extends [infer S extends string, ...unknown[]] ? S : never;
type _firstString = Expect<Equal<FirstIfString<['a', 1]>, 'a'>>;
type _firstNotString = Expect<Equal<FirstIfString<[1, 'a']>, never>>;
// …e CONVERTE i template literal: '42' → 42 (senza extends otterresti la stringa)
type ToNumber<S> = S extends `${infer N extends number}` ? N : never;
type _toNumber = Expect<Equal<ToNumber<'42'>, 42>>;
type _notNumber = Expect<Equal<ToNumber<'ciao'>, never>>;

// stesso nome inferito in più posizioni: covarianti → union, controvarianti → intersezione
type SameCovariant<T> = T extends { a: infer U; b: infer U } ? U : never;
type SameContravariant<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
type _covariantUnion = Expect<Equal<SameCovariant<{ a: string; b: number }>, string | number>>;
type _contravariantIntersection = Expect<
  Equal<SameContravariant<{ a: (x: { id: 1 }) => void; b: (x: { name: 'x' }) => void }>, { id: 1 } & { name: 'x' }>
>;

// @ts-expect-error `infer` è ammesso solo nella clausola extends di un conditional type
type _inferOutside = infer X;

// ---------------------------------------------------------------------------
// Ricorsione nei conditional types
// ---------------------------------------------------------------------------
type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;
type Reverse<T extends readonly unknown[]> = T extends readonly [infer H, ...infer R] ? [...Reverse<R>, H] : [];
type _flatten = Expect<Equal<Flatten<number[][][]>, number>>;
type _reverse = Expect<Equal<Reverse<[1, 2, 3]>, [3, 2, 1]>>;

// ---------------------------------------------------------------------------
// Runtime: Result discriminata + estrazione con infer/Extract
// ---------------------------------------------------------------------------
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export type ResultValue<R> = R extends { ok: true; value: infer V } ? V : never;
export type ResultError<R> = R extends { ok: false; error: infer E } ? E : never;
type _resultValue = Expect<Equal<ResultValue<Result<number>>, number>>;
type _resultError = Expect<Equal<ResultError<Result<number, RangeError>>, RangeError>>;
type _extractOk = Expect<Equal<Extract<Result<number>, { ok: true }>, { readonly ok: true; readonly value: number }>>;

export function parseAge(input: string): Result<number> {
  const age = Number(input);
  if (input.trim() === '' || !Number.isInteger(age)) return { ok: false, error: 'non è un intero' };
  if (age < 0 || age > 130) return { ok: false, error: 'fuori intervallo 0–130' };
  return { ok: true, value: age };
}

/**
 * Tipo di ritorno che dipende dall'argomento. Con un conditional type
 * (`K extends 'number' ? number : …`) il corpo richiederebbe un cast: TS non restringe
 * un tipo generico nel corpo. Con una MAPPA di tipi + accesso indicizzato il cast non serve.
 */
interface ParsedKinds {
  number: number;
  boolean: boolean;
  list: string[];
}
export type ParseKind = keyof ParsedKinds;

const parsers: { [K in ParseKind]: (raw: string) => ParsedKinds[K] } = {
  number: (raw) => Number(raw),
  boolean: (raw) => raw.trim().toLowerCase() === 'true',
  list: (raw) => raw.split(',').map((part) => part.trim()).filter(Boolean),
};

export function parseAs<K extends ParseKind>(kind: K, raw: string): ParsedKinds[K] {
  return parsers[kind](raw);
}
