import type { Equal, Expect } from '../shared/type-test';

/*
 * TIPI OGGETTO: unione e intersezione, type vs interface, ?, readonly, index signature,
 * tipizzazione strutturale ed excess property check, keyof / typeof / T['k'].
 */

// ── Unione e intersezione ────────────────────────────────────────────────────

export type Id = string | number; // unione: UNO dei tipi → puoi usare solo i membri comuni

export interface Audited {
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** Intersezione: TUTTI i tipi insieme (unione delle proprietà). */
export function withAudit<T extends object>(entity: T, updatedBy: string, updatedAt: string): T & Audited {
  return { ...entity, updatedBy, updatedAt };
}

/** Su un'unione si usano solo i membri comuni: per il resto serve narrowing. */
export function formatId(id: Id): string {
  return typeof id === 'number' ? `#${id.toString().padStart(4, '0')}` : id.toUpperCase();
}

function unionAndIntersection(id: Id): void {
  id.toString(); // ok: membro comune
  // @ts-expect-error toFixed esiste solo su number, non su string | number
  id.toFixed();

  type A = { id: string; name: string };
  type B = { id: number; active: boolean };

  type _ = [
    Expect<Equal<keyof (A | B), 'id'>>, // unione di oggetti → solo le chiavi COMUNI
    Expect<Equal<keyof (A & B), 'id' | 'name' | 'active'>>, // intersezione → TUTTE le chiavi
    Expect<Equal<(A & B)['id'], never>>, // proprietà in conflitto → never (nessun errore!)
    Expect<Equal<string & number, never>>,
    Expect<Equal<{ kind: 'a' } & { kind: 'b' }, never>>, // conflitto su un discriminante → l'intero tipo è never
  ];
}

// ── type vs interface ────────────────────────────────────────────────────────

export interface Entity {
  readonly id: number;
}

/** interface extends: il conflitto di proprietà è un ERRORE immediato (con &, invece, diventerebbe never). */
export interface Product extends Entity {
  readonly name: string;
  readonly price: number;
  readonly tags?: readonly string[];
}

/**
 * Declaration merging: due `interface` con lo stesso nome si FONDONO (utile per estendere librerie,
 * es. `declare global { interface Window { … } }`). Con `type` sarebbe "Duplicate identifier".
 */
export interface Product {
  readonly sku: string;
}

function typeVsInterface(): void {
  // @ts-expect-error extends verifica la compatibilità: id non può diventare string
  interface Broken extends Entity { id: string }

  // type: unioni, tuple, primitivi, mapped/conditional types → solo con type
  type Status = 'draft' | 'published';
  type Pair = [Product, Status];

  const product: Product = { id: 1, name: 'Tastiera', price: 49, sku: 'KB-01' }; // sku arriva dal merging
  type _ = Expect<Equal<Pair[1], Status>>;
}

// ── ?, readonly, index signature ─────────────────────────────────────────────

/** Index signature: chiavi arbitrarie. Proprietà dichiarate e firma devono essere compatibili. */
export interface Translations {
  readonly locale: string; // dichiarata → accesso con il punto
  readonly [key: string]: string;
}

export const TRANSLATIONS_IT: Translations = {
  locale: 'it-IT',
  save: 'Salva',
  cancel: 'Annulla',
  delete: 'Elimina',
};

/**
 * `noPropertyAccessFromIndexSignature` (attivo qui): le chiavi della firma si leggono SOLO con ['…'],
 * così il codice rende evidente che la chiave potrebbe non esistere.
 * Senza `noUncheckedIndexedAccess` il tipo è `string` anche per chiavi mancanti: il `??` qui è una scelta nostra.
 */
export function translate(dict: Translations, key: string): string {
  const value: string | undefined = dict[key];
  return value ?? `[${key}]`;
}

function modifiers(dict: Translations, product: Product, list: readonly string[]): void {
  dict.locale; // ok: proprietà dichiarata
  // @ts-expect-error noPropertyAccessFromIndexSignature: usa dict['save']
  dict.save;
  // @ts-expect-error readonly: niente assegnazioni (solo a compile time, a runtime l'oggetto è scrivibile)
  product.name = 'altro';
  // @ts-expect-error readonly string[] (= ReadonlyArray<string>) non ha push, splice, sort…
  list.push('x');
  // @ts-expect-error l'opposto non vale: un readonly array non è assegnabile a string[]
  const mutable: string[] = list;
  const readonlyFromMutable: readonly string[] = ['a']; // mutabile → readonly: ok

  // @ts-expect-error la proprietà dichiarata deve rispettare la firma: number non è string
  interface BadDict { count: number; [key: string]: string }

  // readonly è SHALLOW: le proprietà annidate restano modificabili
  const nested: { readonly inner: { value: number } } = { inner: { value: 1 } };
  nested.inner.value = 2;

  type _ = [
    Expect<Equal<Product['tags'], readonly string[] | undefined>>, // `?` aggiunge undefined in lettura
    Expect<Equal<ReadonlyArray<string>, readonly string[]>>,
    Expect<Equal<Translations['qualsiasi'], string>>, // niente undefined senza noUncheckedIndexedAccess
  ];
}

// ── Tipizzazione strutturale ed excess property check ────────────────────────

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function distanceFromOrigin(point: Point): number {
  return Math.hypot(point.x, point.y);
}

/** Un Point3D È un Point: conta la FORMA, non il nome (a differenza di Java/C#). */
export const POINT_3D = { x: 3, y: 4, z: 12 };

function structural(): void {
  distanceFromOrigin(POINT_3D); // ok: variabile con proprietà in più

  // @ts-expect-error excess property check: SOLO sui letterali oggetto "freschi"
  distanceFromOrigin({ x: 3, y: 4, z: 12 });

  class Meters { constructor(readonly value: number) {} }
  class Seconds { constructor(readonly value: number) {} }
  const time: Seconds = new Meters(5); // stessa forma → compatibili! (per il nominal typing vedi i brand)

  interface Options { verbose?: boolean; retries?: number } // "weak type": tutte opzionali
  const config = { verbos: true };
  // @ts-expect-error weak type detection: nessuna proprietà in comune → errore anche senza letterale fresco
  const options: Options = config;
}

// ── keyof, typeof, T['k'] ────────────────────────────────────────────────────

export const DEFAULT_USER = { name: 'Ada', role: 'admin', loginCount: 3, active: true };

export type User = typeof DEFAULT_USER; // typeof in posizione di TIPO: il tipo di un valore
export type UserKey = keyof User; // unione delle chiavi

export const USER_KEYS: readonly UserKey[] = ['name', 'role', 'loginCount', 'active'];

/** K extends keyof T collega la chiave al tipo del risultato: T[K]. */
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

function keyofAndTypeof(): void {
  // @ts-expect-error la chiave deve esistere in keyof User
  getProperty(DEFAULT_USER, 'email');

  const count = getProperty(DEFAULT_USER, 'loginCount');
  type _ = [
    Expect<Equal<UserKey, 'name' | 'role' | 'loginCount' | 'active'>>,
    Expect<Equal<typeof count, number>>,
    Expect<Equal<User['name' | 'active'], string | boolean>>, // indexed access con un'unione
    Expect<Equal<(typeof USER_KEYS)[number], UserKey>>, // [number] = tipo degli elementi
    Expect<Equal<keyof { [key: string]: unknown }, string | number>>, // obj[0] equivale a obj['0']
  ];
}
