import type { Equal, Expect } from '../shared/type-test';

/**
 * HELPER "DA LIBRERIA": Prettify, UnionToIntersection, IsAny, IsNever, tipi brand.
 */

// ---------------------------------------------------------------------------
// Prettify / Simplify: appiattisce le intersezioni in un unico oggetto (tooltip leggibili)
// ---------------------------------------------------------------------------
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

type Base = { id: number };
type WithName = Base & { name: string };
// strutturalmente compatibili ma NON identici: l'intersezione resta un'intersezione
type _intersectionNotIdentical = Expect<Equal<Equal<WithName, { id: number; name: string }>, false>>;
type _prettified = Expect<Equal<Prettify<WithName>, { id: number; name: string }>>;

// ---------------------------------------------------------------------------
// UnionToIntersection: sfrutta l'inferenza in posizione CONTROVARIANTE (parametro di funzione)
// 1) distribuisce U in un'union di funzioni  2) infer sul parametro → intersezione
// ---------------------------------------------------------------------------
export type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void
  ? I
  : never;
type _unionToIntersection = Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>;
// tra primitivi incompatibili l'intersezione è never
type _primitives = Expect<Equal<UnionToIntersection<string | number>, never>>;

// ---------------------------------------------------------------------------
// IsAny / IsNever / IsUnion
// ---------------------------------------------------------------------------
/** Solo `any` rende `1 & T` qualcosa a cui 0 è assegnabile. */
export type IsAny<T> = 0 extends 1 & T ? true : false;
/** Tupla OBBLIGATORIA: `T extends never` con T = never distribuisce su zero membri → never. */
export type IsNever<T> = [T] extends [never] ? true : false;
type IsNeverNaive<T> = T extends never ? true : false;
type IsUnion<T, All = T> = T extends unknown ? ([All] extends [T] ? false : true) : never;

type _isAny = Expect<Equal<IsAny<any>, true>>;
type _unknownIsNotAny = Expect<Equal<IsAny<unknown>, false>>;
type _isNever = Expect<Equal<IsNever<never>, true>>;
type _isNeverNaive = Expect<Equal<IsNeverNaive<never>, never>>;
type _isUnion = Expect<Equal<IsUnion<'a' | 'b'>, true>>;
type _isNotUnion = Expect<Equal<IsUnion<'a'>, false>>;

// ---------------------------------------------------------------------------
// Tipi brand (nominali): string e Email sono diversi per il compilatore, identici a runtime
// ---------------------------------------------------------------------------
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Email = Brand<string, 'Email'>;
export type UserId = Brand<number, 'UserId'>;
export type OrderId = Brand<number, 'OrderId'>;

type AcceptsEmail<T extends Email> = T;
type AcceptsUserId<T extends UserId> = T;
// @ts-expect-error una string qualsiasi non è una Email: serve passare dal validatore
type _rawString = AcceptsEmail<string>;
// @ts-expect-error stessi dati (number), brand diverso
type _wrongBrand = AcceptsUserId<OrderId>;
// il brand resta usabile come il tipo base
type _stillString = Expect<Equal<Email extends string ? true : false, true>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** L'UNICO punto in cui si crea una Email: il cast è giustificato dalla validazione. */
export function toEmail(value: string): Email | null {
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed) ? (trimmed as Email) : null;
}

export function sendWelcome(email: Email): string {
  return `Email di benvenuto inviata a ${email}`;
}

/** Object.assign restituisce any-ish: il tipo lo ricostruiamo con UnionToIntersection + Prettify. */
export function mergeAll<T extends object[]>(...objects: T): Prettify<UnionToIntersection<T[number]>> {
  return Object.assign({}, ...objects);
}
