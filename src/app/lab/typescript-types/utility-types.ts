import type { Equal, Expect } from '../shared/type-test';

/**
 * UTILITY TYPES BUILT-IN (lib.es5.d.ts), ognuna con una re-implementazione "a mano" verificata.
 */

export interface Product {
  readonly id: number;
  name: string;
  price: number;
  description?: string;
}

// ===========================================================================
// OGGETTI: Partial, Required, Readonly, Record, Pick, Omit
// ===========================================================================
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyRecord<K extends keyof any, V> = { [P in K]: V };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;

type _partial = Expect<Equal<MyPartial<Product>, Partial<Product>>>;
type _required = Expect<Equal<MyRequired<Product>, Required<Product>>>;
type _readonly = Expect<Equal<MyReadonly<Product>, Readonly<Product>>>;
type _record = Expect<Equal<MyRecord<'it' | 'en', string>, Record<'it' | 'en', string>>>;
type _pick = Expect<Equal<MyPick<Product, 'id' | 'name'>, Pick<Product, 'id' | 'name'>>>;
type _omit = Expect<Equal<MyOmit<Product, 'description'>, Omit<Product, 'description'>>>;

// Partial/Required/Readonly/Pick sono OMOMORFI (`in keyof T`): conservano readonly e `?`
type _pickKeepsReadonly = Expect<Equal<Pick<Product, 'id'>, { readonly id: number }>>;
// Required toglie anche `undefined` aggiunto dal `?`
type _requiredValue = Expect<Equal<Required<Product>['description'], string>>;
// Readonly è SUPERFICIALE: gli oggetti annidati restano mutabili (→ DeepReadonly)
type _shallow = Expect<Equal<Readonly<{ tags: string[] }>['tags'], string[]>>;
// Record con union di chiavi: TUTTE obbligatorie; con string: index signature
type _recordAll = Expect<Equal<Record<'it' | 'en', number>, { it: number; en: number }>>;
type _recordIndex = Expect<Equal<Record<string, number>, { [key: string]: number }>>;

// Omit NON è stretto sulle chiavi: `K extends keyof any`, quindi un typo passa in silenzio
type _omitTypo = Expect<Equal<Omit<Product, 'nmae'>, Pick<Product, keyof Product>>>;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
// @ts-expect-error con StrictOmit il typo è un errore
type _strictTypo = StrictOmit<Product, 'nmae'>;

// Omit su una UNION non distribuisce: keyof (A | B) = solo chiavi comuni → le altre spariscono
type Shape = { kind: 'circle'; radius: number; id: string } | { kind: 'square'; side: number; id: string };
type _omitUnion = Expect<Equal<Omit<Shape, 'id'>, { kind: 'circle' | 'square' }>>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type _distributiveOmit = Expect<
  Equal<DistributiveOmit<Shape, 'id'>, Omit<Extract<Shape, { kind: 'circle' }>, 'id'> | Omit<Extract<Shape, { kind: 'square' }>, 'id'>>
>;

export function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

/** TS non sa seguire la rimozione delle chiavi a runtime: il cast è inevitabile (e confinato qui). */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const result: Partial<T> = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/** Trappola: Partial accetta anche `{ price: undefined }` esplicito (senza exactOptionalPropertyTypes). */
export function applyPatch<T extends object>(obj: T, patch: Partial<T>): T {
  return { ...obj, ...patch };
}

// ===========================================================================
// UNION: Exclude, Extract, NonNullable
// ===========================================================================
type Status = 'draft' | 'published' | 'archived' | null | undefined;

type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T & {}; // la definizione attuale in lib.es5.d.ts

type _exclude = Expect<Equal<MyExclude<Status, 'archived' | null | undefined>, 'draft' | 'published'>>;
type _extract = Expect<Equal<Extract<Status, string>, 'draft' | 'published' | 'archived'>>;
type _nonNullable = Expect<Equal<MyNonNullable<Status>, NonNullable<Status>>>;
type _myExtract = Expect<Equal<MyExtract<Status, null | undefined>, null | undefined>>;
// Extract con una "forma": seleziona i membri di una discriminated union
type _extractShape = Expect<Equal<Extract<Shape, { kind: 'circle' }>['radius'], number>>;
// Exclude non controlla che U sia contenuto in T (come Omit)
type _excludeTypo = Expect<Equal<Exclude<Status, 'drafts'>, Status>>;

/** Type guard generica: `.filter(isPresent)` restringe (T | null | undefined)[] a T[]. */
export function isPresent<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// ===========================================================================
// FUNZIONI E CLASSI: Parameters, ReturnType, ConstructorParameters, InstanceType, Awaited
// ===========================================================================
// `(...args: never) => unknown` accetta QUALSIASI funzione (parametri controvarianti) senza usare any
type MyParameters<F extends (...args: never) => unknown> = F extends (...args: infer P) => unknown ? P : never;
type MyReturnType<F extends (...args: never) => unknown> = F extends (...args: never) => infer R ? R : never;
type MyConstructorParameters<C extends abstract new (...args: never) => unknown> = C extends abstract new (
  ...args: infer P
) => unknown
  ? P
  : never;
type MyInstanceType<C extends abstract new (...args: never) => unknown> = C extends abstract new (
  ...args: never
) => infer I
  ? I
  : never;
type MyAwaited<T> = T extends PromiseLike<infer V> ? MyAwaited<V> : T;

export class Money {
  constructor(
    readonly amount: number,
    readonly currency: 'EUR' | 'USD' = 'EUR',
  ) {}

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }
}

export function discount(price: number, percent: number): number {
  return Math.round(price * (100 - percent)) / 100;
}

// `declare`: solo la firma, nessun codice a runtime (serve solo per i test sui tipi)
declare function fetchProduct(id: number): Promise<Product>;

type _parameters = Expect<Equal<MyParameters<typeof discount>, [price: number, percent: number]>>;
type _returnType = Expect<Equal<MyReturnType<typeof discount>, ReturnType<typeof discount>>>;
// parametro con default → opzionale nella tupla
type _ctorParams = Expect<
  Equal<MyConstructorParameters<typeof Money>, [amount: number, currency?: 'EUR' | 'USD']>
>;
// `typeof Money` è il COSTRUTTORE, `Money` è il tipo dell'istanza
type _instance = Expect<Equal<MyInstanceType<typeof Money>, Money>>;
type _async = Expect<Equal<ReturnType<typeof fetchProduct>, Promise<Product>>>;
type _awaited = Expect<Equal<Awaited<ReturnType<typeof fetchProduct>>, Product>>;
// Awaited è ricorsivo e lascia intatti i non-Promise
type _awaitedNested = Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>;
type _awaitedPlain = Expect<Equal<Awaited<string>, string>>;
// una classe astratta non ha `new` ma ConstructorParameters/InstanceType funzionano (abstract new)
declare abstract class Repository {
  constructor(table: string);
}
type _abstract = Expect<Equal<InstanceType<typeof Repository>, Repository>>;
// @ts-expect-error ReturnType vuole il TIPO di una funzione: `ReturnType<discount>` non esiste
type _noTypeof = ReturnType<discount>;

/**
 * Wrapper che conserva la firma. Più robusto di `<F>(fn: F): (...args: Parameters<F>) => ReturnType<F>`:
 * inferire A e R separatamente evita cast nel corpo.
 */
export function withLogging<A extends unknown[], R>(
  fn: (...args: A) => R,
  log: (line: string) => void,
): (...args: A) => R {
  return (...args) => {
    const result = fn(...args);
    log(`${fn.name}(${args.join(', ')}) → ${String(result)}`);
    return result;
  };
}
type _wrapped = Expect<
  Equal<ReturnType<typeof withLogging<Parameters<typeof discount>, number>>, typeof discount>
>;

/** Factory generica: stessa idea di ConstructorParameters/InstanceType, ma con inferenza diretta. */
export function create<A extends unknown[], I>(ctor: new (...args: A) => I, ...args: A): I {
  return new ctor(...args);
}

// ===========================================================================
// THIS: ThisParameterType, OmitThisParameter, ThisType
// ===========================================================================
export interface CurrencyFormat {
  readonly code: 'EUR' | 'USD';
  readonly locale: string;
}

/** `this` come primo "parametro" fittizio: sparisce nel JS compilato. */
export function formatPrice(this: CurrencyFormat, amount: number): string {
  return new Intl.NumberFormat(this.locale, { style: 'currency', currency: this.code }).format(amount);
}

type _thisParameter = Expect<Equal<ThisParameterType<typeof formatPrice>, CurrencyFormat>>;
type _omitThis = Expect<Equal<OmitThisParameter<typeof formatPrice>, (amount: number) => string>>;
// una funzione senza `this` dichiarato → unknown
type _noThis = Expect<Equal<ThisParameterType<typeof discount>, unknown>>;

// bind() è tipizzato con OmitThisParameter (strictBindCallApply, incluso in strict)
export const formatEur = formatPrice.bind({ code: 'EUR', locale: 'it-IT' });
export const formatUsd = formatPrice.bind({ code: 'USD', locale: 'en-US' });
type _bound = Expect<Equal<typeof formatEur, (amount: number) => string>>;

/**
 * ThisType<X> non produce proprietà: dice solo "dentro questi metodi `this` è X".
 * Richiede noImplicitThis (incluso in strict). È il meccanismo di Vue 2 `methods`, Pinia options, ecc.
 */
export function defineModel<D extends object, M extends object>(options: {
  data: D;
  methods: M & ThisType<D & M>;
}): D & M {
  return { ...options.data, ...options.methods };
}

// ===========================================================================
// NoInfer (TS 5.4): esclude un argomento dall'inferenza di T
// ===========================================================================
/** T viene inferito SOLO da `options`: il fallback deve essere una delle opzioni. */
export function chooseOption<T extends string>(options: readonly T[], wanted: string, fallback: NoInfer<T>): T {
  return options.find((option) => option === wanted) ?? fallback;
}
// Senza NoInfer anche `fallback` contribuirebbe a T, che si allargherebbe ad accettarlo (verificato nella spec).
