import type { Equal, Expect } from '../shared/type-test';

/**
 * TIPI RICORSIVI: DeepPartial, DeepReadonly, Json, Paths (con limite di profondità).
 */

export interface Settings {
  theme: { mode: 'light' | 'dark'; accent: string };
  notifications: { email: { enabled: boolean; digest: 'daily' | 'weekly' }; push: boolean };
  language: 'it' | 'en';
}

// Le funzioni sono oggetti: senza il primo ramo verrebbero "mappate" e perderebbero la firma
type AnyFunction = (...args: never) => unknown;

export type DeepPartial<T> = T extends AnyFunction ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type DeepReadonly<T> = T extends AnyFunction
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type _deepPartial = Expect<
  Equal<DeepPartial<Settings>['notifications'], { email?: { enabled?: boolean; digest?: 'daily' | 'weekly' }; push?: boolean } | undefined>
>;
// mapped type omomorfo su un array → array readonly (non un oggetto con 'length')
type _deepReadonlyArray = Expect<Equal<DeepReadonly<{ tags: string[] }>, { readonly tags: readonly string[] }>>;
type _deepReadonlyFn = Expect<Equal<DeepReadonly<{ run: () => void }>, { readonly run: () => void }>>;

// ---------------------------------------------------------------------------
// Json: un alias che riferisce se stesso (ammesso dentro array/oggetti)
// ---------------------------------------------------------------------------
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type AcceptsJson<T extends Json> = T;
type _json = AcceptsJson<{ a: [1, 'x', { b: null }] }>;
// @ts-expect-error undefined non esiste in JSON (JSON.stringify lo scarta)
type _undefined = AcceptsJson<{ a: undefined }>;
// @ts-expect-error Date è un'interfaccia con metodi, non un valore JSON
type _date = AcceptsJson<{ when: Date }>;

// ---------------------------------------------------------------------------
// Paths<T>: tutti i percorsi "a.b.c". Il contatore di profondità evita l'errore
// TS2589 "Type instantiation is excessively deep and possibly infinite" su tipi ciclici/enormi.
// ---------------------------------------------------------------------------
type PreviousDepth = [never, 0, 1, 2, 3, 4, 5];

export type Paths<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends readonly unknown[] | AnyFunction
          ? K
          : T[K] extends object
            ? K | `${K}.${Paths<T[K], PreviousDepth[Depth]>}`
            : K;
      }[keyof T & string]
    : never;

export type PathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? PathValue<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type SettingsPath = Paths<Settings>;
type _paths = Expect<
  Equal<
    SettingsPath,
    | 'theme'
    | 'theme.mode'
    | 'theme.accent'
    | 'notifications'
    | 'notifications.email'
    | 'notifications.email.enabled'
    | 'notifications.email.digest'
    | 'notifications.push'
    | 'language'
  >
>;
type _pathValue = Expect<Equal<PathValue<Settings, 'notifications.email.digest'>, 'daily' | 'weekly'>>;

// tipo CICLICO: senza limite la ricorsione non terminerebbe; con Depth=1 si ferma al secondo livello
interface TreeNode {
  label: string;
  parent: TreeNode;
}
type _cyclic = Expect<Equal<Paths<TreeNode, 1>, 'label' | 'parent' | 'parent.label' | 'parent.parent'>>;

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** La navigazione dinamica perde i tipi: il cast finale è verificato dai test sul tipo PathValue. */
export function getPath<T, P extends Paths<T> & string>(obj: T, path: P): PathValue<T, P> {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    current = isPlainObject(current) ? current[key] : undefined;
  }
  return current as PathValue<T, P>;
}

/** NoInfer: T viene SOLO da `base`; altrimenti il patch parziale diventerebbe un candidato per T. */
export function mergeDeep<T extends object>(base: T, patch: NoInfer<DeepPartial<T>>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    const previous = result[key];
    result[key] = isPlainObject(previous) && isPlainObject(value) ? mergeDeep(previous, value) : value;
  }
  return result as T;
}

export function deepFreeze<T extends object>(obj: T): DeepReadonly<T> {
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) deepFreeze(value);
  }
  return Object.freeze(obj) as DeepReadonly<T>;
}
