import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { createProfileForm, readSignals } from './angular-types';
import { type ParseKind, parseAge, parseAs } from './conditional-types';
import { type Tab, TABS, getProp } from './generic-functions';
import { type Employee, type KeysOfType, groupBy, toGetters } from './mapped-types';
import { type DeepPartial, type DeepReadonly, type Settings, type SettingsPath, deepFreeze, getPath, mergeDeep } from './recursive-types';
import { type AppEvents, buildRoute, createEmitter, handlerName } from './template-literal-types';
import { mergeAll, sendWelcome, toEmail } from './type-helpers';
import { type Account, type Role, ROLES, isRole, permissionsOf } from './type-operators';
import {
  type Product,
  Money,
  applyPatch,
  chooseOption,
  create,
  defineModel,
  discount,
  formatEur,
  formatUsd,
  isPresent,
  omit,
  pick,
  withLogging,
} from './utility-types';

const ACCOUNT: Account = {
  id: 7,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  address: { city: 'Londra', zip: 'NW1' },
  tags: ['matematica', 'pioniera'],
};
const ACCOUNT_KEYS = ['name', 'role', 'address', 'tags'] as const satisfies readonly (keyof Account)[];

const PRODUCT: Product = { id: 1, name: 'Tastiera', price: 49.9, description: 'Layout italiano' };

const READINGS: readonly (number | null | undefined)[] = [12, null, 7, undefined, 3];

const SIZES = ['S', 'M', 'L'] as const;

const EMPLOYEES: readonly Employee[] = [
  { id: 1, name: 'Giulia', team: 'frontend', seniority: 3, remote: true },
  { id: 2, name: 'Marco', team: 'backend', seniority: 5, remote: false, manager: 'Sara' },
  { id: 3, name: 'Sara', team: 'backend', seniority: 8, remote: true },
  { id: 4, name: 'Luca', team: 'frontend', seniority: 3, remote: false, manager: 'Sara' },
  { id: 5, name: 'Elena', team: 'design', seniority: 5, remote: true },
];
const GROUP_KEYS = ['team', 'seniority', 'name'] as const satisfies readonly KeysOfType<Employee, string | number>[];

const PARSE_KINDS = ['number', 'boolean', 'list'] as const satisfies readonly ParseKind[];

const DEFAULT_SETTINGS = deepFreeze<Settings>({
  theme: { mode: 'light', accent: '#2563eb' },
  notifications: { email: { enabled: true, digest: 'daily' }, push: false },
  language: 'it',
});
const SETTINGS_PATHS = [
  'theme.mode',
  'notifications.email',
  'notifications.email.digest',
  'language',
] as const satisfies readonly SettingsPath[];
const DARK_PATCH: DeepPartial<Settings> = { theme: { mode: 'dark' } };
const WEEKLY_PATCH: DeepPartial<Settings> = { notifications: { email: { digest: 'weekly' } } };

const CODE = {
  operators: ts`
    export const ROLES = ['admin', 'editor', 'viewer'] as const;
    export type Role = (typeof ROLES)[number];         // 'admin' | 'editor' | 'viewer'

    export const PERMISSIONS = { admin: ['read', 'write', 'delete'], editor: ['read', 'write'], viewer: ['read'] } as const;
    type Keys = keyof typeof PERMISSIONS;               // Role
    type Permission = (typeof PERMISSIONS)[Role][number]; // 'read' | 'write' | 'delete'

    type City = Account['address']['city'];            // string
    type IdOrRole = Account['id' | 'role'];            // number | Role
    type Tag = Account['tags'][number];                // string
    type ValueOf<T> = T[keyof T];

    type A = keyof { [key: string]: unknown };         // string | number (!)
    type B = keyof ({ a: 1; b: 2 } | { a: 1; c: 3 });  // 'a' (solo chiavi comuni)
    type C = keyof ({ a: 1 } & { b: 2 });              // 'a' | 'b'
    // @ts-expect-error nei tipi si usa T['k'], non T.k
    type D = Account.name;

    export function isRole(value: string): value is Role {
      return (ROLES as readonly string[]).includes(value);
    }
  `,
  objects: ts`
    type MyPartial<T>  = { [K in keyof T]?: T[K] };
    type MyRequired<T> = { [K in keyof T]-?: T[K] };
    type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
    type MyRecord<K extends keyof any, V> = { [P in K]: V };
    type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
    type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;

    type _ = Expect<Equal<MyPartial<Product>, Partial<Product>>>;       // ✔ per tutte

    // Omit NON è stretto: K extends keyof any → un typo passa in silenzio
    type NoError = Omit<Product, 'nmae'>;
    type StrictOmit<T, K extends keyof T> = Omit<T, K>;
    // Omit su una union: keyof (A | B) = chiavi comuni → perde le altre
    type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

    export function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
      const result = {} as Pick<T, K>;
      for (const key of keys) result[key] = obj[key];
      return result;
    }
    export function applyPatch<T extends object>(obj: T, patch: Partial<T>): T {
      return { ...obj, ...patch };
    }
    applyPatch(product, { price: undefined });         // compila! (senza exactOptionalPropertyTypes)
  `,
  unions: ts`
    type Status = 'draft' | 'published' | 'archived' | null | undefined;

    type MyExclude<T, U> = T extends U ? never : T;    // conditional type DISTRIBUTIVO
    type MyExtract<T, U> = T extends U ? T : never;
    type MyNonNullable<T> = T & {};                    // definizione attuale in lib.es5.d.ts

    type Visible = Exclude<Status, 'archived' | null | undefined>; // 'draft' | 'published'
    type Circle = Extract<Shape, { kind: 'circle' }>;              // membro della union
    type Oops = Exclude<Status, 'drafts'>;                         // nessun errore: Status invariato

    export function isPresent<T>(value: T): value is NonNullable<T> {
      return value !== null && value !== undefined;
    }
    const values = readings.filter(isPresent);          // number[]
  `,
  functions: ts`
    // (...args: never) => unknown accetta QUALSIASI funzione, senza any
    type MyParameters<F extends (...args: never) => unknown> =
      F extends (...args: infer P) => unknown ? P : never;
    type MyReturnType<F extends (...args: never) => unknown> =
      F extends (...args: never) => infer R ? R : never;
    type MyConstructorParameters<C extends abstract new (...args: never) => unknown> =
      C extends abstract new (...args: infer P) => unknown ? P : never;
    type MyInstanceType<C extends abstract new (...args: never) => unknown> =
      C extends abstract new (...args: never) => infer I ? I : never;
    type MyAwaited<T> = T extends PromiseLike<infer V> ? MyAwaited<V> : T;

    type P = Parameters<typeof discount>;              // [price: number, percent: number]
    type C = ConstructorParameters<typeof Money>;      // [amount: number, currency?: 'EUR' | 'USD']
    type I = InstanceType<typeof Money>;               // Money (typeof Money = il costruttore)
    type D = Awaited<ReturnType<typeof fetchProduct>>; // Product
    // @ts-expect-error serve typeof: discount è un valore
    type X = ReturnType<discount>;

    export function withLogging<A extends unknown[], R>(fn: (...args: A) => R, log: (line: string) => void) {
      return (...args: A): R => {
        const result = fn(...args);
        log(\`\${fn.name}(\${args.join(', ')}) → \${String(result)}\`);
        return result;
      };
    }
    export function create<A extends unknown[], I>(ctor: new (...args: A) => I, ...args: A): I {
      return new ctor(...args);
    }
  `,
  this: ts`
    export function formatPrice(this: CurrencyFormat, amount: number): string {
      return new Intl.NumberFormat(this.locale, { style: 'currency', currency: this.code }).format(amount);
    }
    type T1 = ThisParameterType<typeof formatPrice>;   // CurrencyFormat
    type T2 = OmitThisParameter<typeof formatPrice>;   // (amount: number) => string
    export const formatEur = formatPrice.bind({ code: 'EUR', locale: 'it-IT' }); // T2
    formatPrice(10);                                   // ✘ 'this' context di tipo void

    // ThisType: nessuna proprietà, solo il tipo di 'this' dentro i metodi
    export function defineModel<D extends object, M extends object>(options: {
      data: D;
      methods: M & ThisType<D & M>;
    }): D & M {
      return { ...options.data, ...options.methods };
    }
    const counter = defineModel({
      data: { count: 0 },
      methods: { increment() { return ++this.count; } }, // this: { count: number } & { increment() }
    });
  `,
  noInfer: ts`
    export function chooseOption<T extends string>(
      options: readonly T[],
      wanted: string,
      fallback: NoInfer<T>,                            // NON partecipa all'inferenza di T
    ): T {
      return options.find((option) => option === wanted) ?? fallback;
    }

    chooseOption(['S', 'M', 'L'], input, 'M');        // T = 'S' | 'M' | 'L'
    chooseOption(['S', 'M', 'L'], input, 'XL');       // ✘ '"XL"' non assegnabile a 'S' | 'M' | 'L'
    // senza NoInfer: T = 'S' | 'M' | 'L' | 'XL' e l'errore sparisce
  `,
  generics: ts`
    // vincolo con keyof: la chiave è legata all'oggetto, il ritorno è T[K]
    export function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
      return obj[key];
    }
    getProp(account, 'address');                       // { city: string; zip: string }
    getProp(account, 'phone');                         // ✘

    // default (in fondo, e devono rispettare il vincolo)
    interface ApiResponse<T = unknown, E extends Error = Error> { data?: T; error?: E }

    // const type parameter (TS 5.0)
    export function defineTabs<const T extends readonly string[]>(tabs: T): T { return tabs; }
    export const TABS = defineTabs(['profilo', 'sicurezza', 'notifiche']);
    //    ^? readonly ['profilo', 'sicurezza', 'notifiche']   (senza const: string[])
    export type Tab = (typeof TABS)[number];

    // inferenza da più argomenti: T unico
    function pair<T>(first: T, second: T): readonly [T, T]
    pair(1, 'x');                                      // ✘ string non assegnabile a number
    pair<number | string>(1, 'x');                     // ok: argomenti espliciti (tutti o nessuno)
  `,
  variance: ts`
    interface Producer<out T> { get: () => T }         // covariante
    interface Consumer<in T> { accept: (value: T) => void } // controvariante
    interface Box<in out T> { get: () => T; set: (value: T) => void } // invariante

    Producer<'a'>  → Producer<string>                  // ✔
    Consumer<string> → Consumer<'a'>                   // ✔ (direzione opposta)
    Box<'a'>       → Box<string>                       // ✘

    // @ts-expect-error T compare in output: 'in' è sbagliato (le annotazioni sono verificate)
    interface WrongProducer<in T> { get: () => T }

    // TRAPPOLA: sintassi metodo = bivariante anche con strictFunctionTypes
    interface MethodHandler<T>   { handle(value: T): void }       // MethodHandler<'a'> → MethodHandler<string> ✔ (!)
    interface PropertyHandler<T> { handle: (value: T) => void }   // PropertyHandler<'a'> → PropertyHandler<string> ✘
  `,
  mapped: ts`
    type Mutable<T>  = { -readonly [K in keyof T]: T[K] };
    type Frozen<T>   = { +readonly [K in keyof T]+?: T[K] };
    type Concrete<T> = { [K in keyof T]-?: T[K] };
    type M = Mutable<readonly [1, 2]>;                 // [1, 2]: omomorfo su tuple → tuple

    // rimappatura con 'as' + template literal
    type Getters<T> = { [K in keyof T & string as \`get\${Capitalize<K>}\`]: () => T[K] };

    // filtro: 'never' come chiave = proprietà scartata
    type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

    // "mappa e indicizza": union delle chiavi con valore V (-? evita undefined)
    export type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
    type K = KeysOfType<Employee, number>;             // 'id' | 'seniority'

    export function groupBy<T, K extends KeysOfType<T, string | number>>(items: readonly T[], key: K) {
      const groups: Partial<Record<T[K] & PropertyKey, T[]>> = {};
      for (const item of items) {
        const group = item[key] as T[K] & PropertyKey; // TS non deduce T[K] ⊂ string | number
        (groups[group] ??= []).push(item);
      }
      return groups;
    }
    groupBy(employees, 'remote');                      // ✘ boolean non è string | number
  `,
  conditional: ts`
    type ToArray<T> = T extends unknown ? T[] : never;
    type A = ToArray<string | number>;                 // string[] | number[]   (distributivo)
    type B = ToArray<boolean>;                         // false[] | true[]
    type C = IsString<never>;                          // never (union vuota!)

    type ToArrayND<T> = [T] extends [unknown] ? T[] : never;
    type D = ToArrayND<string | number>;               // (string | number)[]
    type E = IsStringStrict<never>;                    // true: [never] extends [string]
    type F<T> = T[] extends string[] ? 1 : 0;          // non distribuisce: T non è "nudo"

    // tipo di ritorno dipendente dall'argomento: mappa + accesso indicizzato, nessun cast
    interface ParsedKinds { number: number; boolean: boolean; list: string[] }
    const parsers: { [K in keyof ParsedKinds]: (raw: string) => ParsedKinds[K] } = { … };

    export function parseAs<K extends keyof ParsedKinds>(kind: K, raw: string): ParsedKinds[K] {
      return parsers[kind](raw);
    }
    parseAs('list', 'a, b');                           // string[]
  `,
  infer: ts`
    type ElementType<T> = T extends readonly (infer E)[] ? E : never;
    type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
    type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

    // infer con vincolo (TS 4.7): filtra e CONVERTE
    type FirstIfString<T> = T extends [infer S extends string, ...unknown[]] ? S : never;
    type ToNumber<S> = S extends \`\${infer N extends number}\` ? N : never;   // '42' → 42

    // stesso infer in più posizioni: covariante → union, controvariante → intersezione
    type Same<T> = T extends { a: infer U; b: infer U } ? U : never;

    // ricorsione
    type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;
    type Reverse<T extends readonly unknown[]> =
      T extends readonly [infer H, ...infer R] ? [...Reverse<R>, H] : [];

    export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
    export type ResultValue<R> = R extends { ok: true; value: infer V } ? V : never;

    // template: @let + @if restringe la union discriminata
    @let result = ageResult();
    @if (result.ok) { {{ result.value }} } @else { {{ result.error }} }
  `,
  templateLiteral: ts`
    Uppercase<'ciao'>  // 'CIAO'      Lowercase<'CIAO'>        // 'ciao'
    Capitalize<'userLogin'> // 'UserLogin'   Uncapitalize<'UserLogin'> // 'userLogin'

    type ButtonClass = \`btn-\${'primary' | 'danger'}-\${'sm' | 'lg'}\`; // 4 combinazioni
    type CssLength = \`\${number}px\` | \`\${number}rem\`;                // pattern infinito
    type KebabToCamel<S extends string> =
      S extends \`\${infer H}-\${infer T}\` ? \`\${H}\${KebabToCamel<Capitalize<T>>}\` : S;

    export type AppEvents = {                          // type, NON interface (index signature!)
      userLogin: { name: string };
      userLogout: { reason: 'manuale' | 'scaduta' };
      cartUpdated: { items: number };
    };
    type HandlerName<K extends string> = \`on\${Capitalize<K>}\`;
    type Handlers<E> = { [K in keyof E & string as HandlerName<K>]: (payload: E[K]) => void };

    export interface Emitter<E extends Record<string, object>> {
      on<K extends keyof E & string>(event: K, handler: (payload: E[K]) => void): () => void;
      emit<K extends keyof E & string>(event: K, payload: E[K]): void;
    }
    const events = createEmitter<AppEvents>();
    events.on('userLogin', ({ name }) => …);           // name: string
    events.emit('cartUpdated', { items: '3' });        // ✘ string non è number
    events.emit('userLogon', …);                       // ✘ evento inesistente
  `,
  route: ts`
    type ParamNames<Path extends string> =
      Path extends \`\${string}:\${infer Name}/\${infer Rest}\` ? Name | ParamNames<Rest>
      : Path extends \`\${string}:\${infer Name}\` ? Name
      : never;

    export type RouteParams<Path extends string> = { [K in ParamNames<Path>]: string };
    type P = RouteParams<'/users/:id/posts/:postId'>;  // { id: string; postId: string }

    export function buildRoute<Path extends string>(path: Path, params: RouteParams<Path>): string {
      const values: Record<string, string> = params;
      return path.replace(/:(\\w+)/g, (_, name: string) => encodeURIComponent(values[name] ?? ''));
    }
    buildRoute('/users/:id/posts/:postId', { id: '7', postId: '42' });
    buildRoute('/users/:id', {});                      // ✘ manca id
  `,
  recursive: ts`
    type AnyFunction = (...args: never) => unknown;
    export type DeepPartial<T> =
      T extends AnyFunction ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
    export type DeepReadonly<T> =
      T extends AnyFunction ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

    export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

    type PreviousDepth = [never, 0, 1, 2, 3, 4, 5];
    export type Paths<T, Depth extends number = 5> = [Depth] extends [never] ? never
      : T extends object
        ? { [K in keyof T & string]: T[K] extends readonly unknown[] | AnyFunction ? K
              : T[K] extends object ? K | \`\${K}.\${Paths<T[K], PreviousDepth[Depth]>}\` : K
          }[keyof T & string]
        : never;

    export type PathValue<T, P extends string> =
      P extends \`\${infer Head}.\${infer Rest}\`
        ? Head extends keyof T ? PathValue<T[Head], Rest> : never
        : P extends keyof T ? T[P] : never;

    getPath(settings, 'notifications.email.digest');   // 'daily' | 'weekly'
    function mergeDeep<T extends object>(base: T, patch: NoInfer<DeepPartial<T>>): T
    mergeDeep(settings, { theme: { mode: 'dark' } });  // senza NoInfer T verrebbe inferito anche dal patch
  `,
  helpers: ts`
    export type Prettify<T> = { [K in keyof T]: T[K] } & {};
    type P = Prettify<{ id: number } & { name: string }>;   // { id: number; name: string }

    export type UnionToIntersection<U> =
      (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;

    export type IsAny<T> = 0 extends 1 & T ? true : false;
    export type IsNever<T> = [T] extends [never] ? true : false; // T extends never → never

    declare const brand: unique symbol;
    export type Brand<T, B extends string> = T & { readonly [brand]: B };
    export type Email = Brand<string, 'Email'>;

    export function toEmail(value: string): Email | null {
      return EMAIL_PATTERN.test(value) ? (value as Email) : null; // unico cast, dopo la validazione
    }
    sendWelcome('ada@example.com');                    // ✘ string non è Email
    const email = toEmail(input);
    if (email) sendWelcome(email);                     // ✔

    export function mergeAll<T extends object[]>(...objects: T): Prettify<UnionToIntersection<T[number]>>
  `,
  angular: ts`
    // Signal<T> = (() => T) & { [SIGNAL]: unknown }
    type SignalValue<S> = S extends Signal<infer V> ? V : never;
    ReturnType<Signal<number>>                         // number
    ModelSignal<T> ⊂ WritableSignal<T> ⊂ Signal<T>;  InputSignal<T> ⊂ Signal<T> (non scrivibile)
    InputSignalWithTransform<boolean, string | boolean> // legge boolean, il template passa string | boolean

    const form = new FormGroup({
      name: new FormControl('', { nonNullable: true }),
      email: new FormControl(''),                      // FormControl<string | null>
      newsletter: new FormControl(false, { nonNullable: true }),
    });
    form.value;         // Partial<{ name: string; email: string | null; newsletter: boolean }>
    form.getRawValue(); // { name: string; email: string | null; newsletter: boolean }
    // internamente: ɵFormGroupValue<TControls> / ɵFormGroupRawValue<TControls>
    type ControlsOf<T> = { [K in keyof T]: FormControl<T[K]> };

    // ResolveFn<T> = (route, state) => MaybeAsync<T | RedirectCommand>
    type ResolvedData<R> = R extends ResolveFn<infer T> ? T : never;
  `,
};

/**
 * Pagina: TYPESCRIPT — TIPI AVANZATI E UTILITY
 *
 * Ogni affermazione è verificata IN COMPILAZIONE nei file .ts della cartella
 * (`type _ = Expect<Equal<A, B>>`, casi vietati con `// @ts-expect-error`).
 *
 * Checklist certificazione:
 * - keyof / typeof / T['k'] / T[number]: derivare union da `as const` invece di duplicarle.
 * - Utility built-in: Partial, Required, Readonly (superficiale), Record, Pick, Omit (chiavi NON strette,
 *   non distributivo), Exclude/Extract/NonNullable, Parameters/ReturnType/ConstructorParameters/
 *   InstanceType/Awaited, ThisParameterType/OmitThisParameter/ThisType, NoInfer, Uppercase & co.
 * - Mapped types: modificatori ±readonly/±?, omomorfi vs no, `as` per rinominare/filtrare (never).
 * - Conditional types: distributivi solo su parametro nudo, `[T] extends [U]` per evitarlo, `infer`.
 * - Template literal types: prodotto cartesiano, parsing con infer, nomi evento `on${Capitalize<K>}`.
 * - Ricorsione: DeepPartial/DeepReadonly/Json/Paths, limite di profondità (TS2589).
 * - Generici: vincoli, default, inferenza, `const` T, varianza `in`/`out`, metodi bivarianti.
 * - Brand types per tipi nominali; IsAny/IsNever; UnionToIntersection; Prettify.
 */
@Component({
  selector: 'sbu-typescript-types-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock, JsonPipe],
  template: `
    <sbu-lab-page heading="TypeScript: tipi avanzati e utility">
      <span intro>
        Il type system come linguaggio: utility built-in riscritte a mano, mapped/conditional/template literal types,
        ricorsione e generici. Ogni affermazione è verificata dal compilatore con <code>Expect&lt;Equal&lt;A, B&gt;&gt;</code>.
      </span>

      <sbu-example [n]="1" title="keyof, typeof, accesso indicizzato">
        <fieldset class="flex flex-wrap gap-3 text-sm">
          <legend class="mb-1 font-medium">Role (da ROLES as const)</legend>
          @for (role of roles; track role) {
            <label class="flex items-center gap-1">
              <input type="radio" name="tt-role" [value]="role" [checked]="selectedRole() === role" (change)="selectedRole.set(role)" />
              {{ role }}
            </label>
          }
        </fieldset>
        <p class="mt-2 text-sm" aria-live="polite">
          permissionsOf('{{ selectedRole() }}') → <code>{{ permissions().join(', ') }}</code>
        </p>
        <label class="mt-3 flex flex-col gap-1 text-sm">
          Stringa da verificare con la type guard isRole
          <input #roleInput class="field max-w-xs" [value]="roleText()" (input)="roleText.set(roleInput.value)" />
        </label>
        <p class="mt-2 text-sm" aria-live="polite">
          isRole → <strong>{{ roleCheck() }}</strong>
        </p>
        <sbu-code [code]="code.operators" />
        <p note>
          <code>keyof typeof OBJ</code> per le chiavi di un VALORE, <code>(typeof ARR)[number]</code> per gli elementi di un
          array <code>as const</code> (senza <code>as const</code> ottieni <code>string</code>). <code>keyof</code> di una
          index signature string è <code>string | number</code>; di un'union dà solo le chiavi comuni.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="Partial, Required, Readonly, Record, Pick, Omit">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="showPick()">pick(id, name)</button>
          <button type="button" class="btn" (click)="showOmit()">omit(description)</button>
          <button type="button" class="btn" (click)="showPatch()">applyPatch(price: 39.9)</button>
          <button type="button" class="btn" (click)="showUndefinedPatch()">applyPatch(price: undefined)</button>
        </div>
        <p class="mt-3 text-sm font-medium" aria-live="polite">{{ objectDemo().label }}</p>
        <sbu-code [code]="objectDemo().json" label="Risultato della utility" />
        <sbu-code [code]="code.objects" />
        <p note>
          Omomorfi (<code>in keyof T</code>) → conservano <code>readonly</code> e <code>?</code>. <code>Readonly</code> è
          superficiale. <code>Omit</code> accetta chiavi inesistenti e su un'union tiene solo le chiavi comuni: usa
          <code>StrictOmit</code> / <code>DistributiveOmit</code>. <code>Partial</code> accetta <code>undefined</code>
          esplicito, che sovrascrive il valore (flag <code>exactOptionalPropertyTypes</code> per vietarlo).
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="Exclude, Extract, NonNullable">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>readings</dt>
          <dd><code>{{ readingsLabel }}</code></dd>
          <dt>filter(isPresent)</dt>
          <dd><code>{{ presentReadings.join(', ') }}</code> (tipo <code>number[]</code>)</dd>
        </dl>
        <sbu-code [code]="code.unions" />
        <p note>
          Sono conditional types distributivi: lavorano membro per membro dell'union. <code>Extract</code> con una forma
          (<code>&#123; kind: 'circle' &#125;</code>) seleziona i membri di una discriminated union. Come <code>Omit</code>,
          <code>Exclude</code> non verifica che U faccia parte di T.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Parameters, ReturnType, ConstructorParameters, InstanceType, Awaited" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="runDiscount()">loggedDiscount(80, 25)</button>
          <button type="button" class="btn" (click)="createMoney()">create(Money, 42.5, 'USD')</button>
        </div>
        <ol role="log" class="mt-3 max-h-32 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          @for (line of functionLog(); track $index) {
            <li>{{ line }}</li>
          }
        </ol>
        <sbu-code [code]="code.functions" />
        <p note>
          Queste utility vogliono un TIPO: <code>ReturnType&lt;typeof fn&gt;</code>, non <code>ReturnType&lt;fn&gt;</code>.
          <code>typeof Classe</code> è il costruttore, <code>Classe</code> l'istanza. Nei wrapper preferisci inferire
          <code>A</code> e <code>R</code> separatamente: con <code>Parameters&lt;F&gt;</code> servono cast nel corpo.
          <code>Awaited</code> è ricorsivo (Promise di Promise).
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="this: ThisParameterType, OmitThisParameter, ThisType" level="avanzato">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>formatEur(1234.5)</dt>
          <dd>{{ euroPrice }}</dd>
          <dt>formatUsd(1234.5)</dt>
          <dd>{{ dollarPrice }}</dd>
        </dl>
        <button type="button" class="btn mt-3" (click)="incrementModel()">counter.increment() → {{ modelCount() }}</button>
        <sbu-code [code]="code.this" />
        <p note>
          <code>this: X</code> è un parametro fittizio (sparisce nel JS). <code>bind</code> è tipizzato con
          <code>OmitThisParameter</code> grazie a <code>strictBindCallApply</code>. <code>ThisType&lt;T&gt;</code> è un
          marker: non aggiunge proprietà, funziona solo dentro un object literal contestualmente tipizzato e con
          <code>noImplicitThis</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="NoInfer" level="intermedio">
        <label class="flex flex-col gap-1 text-sm">
          Taglia richiesta (opzioni S, M, L; fallback M)
          <input #sizeInput class="field max-w-xs" [value]="wantedSize()" (input)="wantedSize.set(sizeInput.value)" />
        </label>
        <p class="mt-2 text-sm" aria-live="polite">chooseOption → <strong>{{ chosenSize() }}</strong></p>
        <sbu-code [code]="code.noInfer" />
        <p note>
          TS 5.4. Senza <code>NoInfer</code> ogni argomento è un "candidato" per T e l'union si allarga fino ad accettare
          il valore sbagliato. Alternativa storica: un secondo type parameter <code>F extends T</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="Generici: vincoli, default, inferenza, const" level="intermedio">
        <fieldset class="flex flex-wrap gap-3 text-sm">
          <legend class="mb-1 font-medium">Chiave (K extends keyof Account)</legend>
          @for (key of accountKeys; track key) {
            <label class="flex items-center gap-1">
              <input type="radio" name="tt-account-key" [value]="key" [checked]="accountKey() === key" (change)="accountKey.set(key)" />
              {{ key }}
            </label>
          }
        </fieldset>
        <p class="mt-2 text-sm" aria-live="polite">
          getProp(account, '{{ accountKey() }}') → <code>{{ accountValue() | json }}</code>
        </p>
        <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tab da defineTabs">
          @for (tab of tabs; track tab) {
            <button type="button" class="btn" [attr.aria-pressed]="activeTab() === tab" (click)="activeTab.set(tab)">{{ tab }}</button>
          }
        </div>
        <sbu-code [code]="code.generics" />
        <p note>
          <code>K extends keyof T</code> lega la chiave all'oggetto e il ritorno <code>T[K]</code> segue la chiave scelta.
          Gli argomenti di tipo espliciti sono "tutto o niente" (niente inferenza parziale). <code>const T</code> evita
          <code>as const</code> al chiamante; il vincolo <code>readonly string[]</code> serve ad accettare la tupla
          readonly inferita. Collegamento: <code>SearchSelect&lt;T&gt;</code> (pagina Generici) usa proprio
          <code>key: keyof T</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="Varianza: in, out, bivarianza dei metodi" level="avanzato">
        <sbu-code [code]="code.variance" />
        <p note>
          <code>out T</code> = T solo in output (covariante), <code>in T</code> = solo in input (controvariante), entrambi
          = invariante. Le annotazioni sono verificate e accelerano i confronti su tipi grandi. Con
          <code>strictFunctionTypes</code> i parametri delle PROPRIETÀ funzione sono controvarianti, quelli dei METODI
          restano bivarianti (è così che <code>Array&lt;'a'&gt;</code> è assegnabile a <code>Array&lt;string&gt;</code>).
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="Mapped types: modificatori, as, filtro con never" level="intermedio">
        <fieldset class="flex flex-wrap gap-3 text-sm">
          <legend class="mb-1 font-medium">groupBy su KeysOfType&lt;Employee, string | number&gt;</legend>
          @for (key of groupKeys; track key) {
            <label class="flex items-center gap-1">
              <input type="radio" name="tt-group-key" [value]="key" [checked]="groupKey() === key" (change)="groupKey.set(key)" />
              {{ key }}
            </label>
          }
        </fieldset>
        <ul class="mt-3 space-y-1 text-sm" aria-live="polite">
          @for (group of groups(); track group.key) {
            <li><code>{{ group.key }}</code>: {{ group.names }}</li>
          }
        </ul>
        <p class="mt-2 text-sm">toGetters(employees[0]).getName() → <strong>{{ firstEmployeeName }}</strong></p>
        <sbu-code [code]="code.mapped" />
        <p note>
          <code>as</code> rinomina o, restituendo <code>never</code>, elimina la chiave. <code>KeysOfType</code> potrebbe
          rendere più stretto <code>SearchSelect</code>: <code>key: KeysOfType&lt;T, string&gt;</code> vieterebbe
          <code>key="id"</code> (number), oggi accettato e convertito con <code>String()</code>. Dentro la funzione
          però TS non deduce che <code>T[K]</code> sia string: serve un cast o il vincolo invertito
          <code>T extends Record&lt;K, string&gt;</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="Conditional types e distribuzione" level="avanzato">
        <fieldset class="flex flex-wrap gap-3 text-sm">
          <legend class="mb-1 font-medium">parseAs(kind, raw)</legend>
          @for (kind of parseKinds; track kind) {
            <label class="flex items-center gap-1">
              <input type="radio" name="tt-parse-kind" [value]="kind" [checked]="parseKind() === kind" (change)="parseKind.set(kind)" />
              {{ kind }}
            </label>
          }
        </fieldset>
        <label class="mt-3 flex flex-col gap-1 text-sm">
          Valore grezzo
          <input #rawInput class="field max-w-xs" [value]="rawValue()" (input)="rawValue.set(rawInput.value)" />
        </label>
        <p class="mt-2 text-sm" aria-live="polite">
          → <code>{{ parsed() | json }}</code>
        </p>
        <sbu-code [code]="code.conditional" />
        <p note>
          Distribuzione solo se T è un parametro "nudo" a sinistra di <code>extends</code>: <code>never</code> diventa
          <code>never</code> e <code>boolean</code> si spezza in <code>true | false</code>. Con
          <code>[T] extends [U]</code> la distribuzione si spegne. Per un ritorno che dipende da un argomento, un
          conditional type obbliga a un cast nel corpo; una mappa di tipi + <code>T[K]</code> no.
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="infer, infer extends, ricorsione" level="avanzato">
        <label class="flex flex-col gap-1 text-sm">
          Età (parseAge restituisce un Result)
          <input #ageInput class="field max-w-xs" [value]="ageText()" (input)="ageText.set(ageInput.value)" />
        </label>
        @let result = ageResult();
        <p class="mt-2 text-sm" aria-live="polite">
          @if (result.ok) {
            ok → value: <strong>{{ result.value }}</strong>
          } @else {
            <span class="text-destructive">errore → {{ result.error }}</span>
          }
        </p>
        <sbu-code [code]="code.infer" />
        <p note>
          <code>infer</code> esiste solo nella clausola <code>extends</code> di un conditional type.
          <code>infer N extends number</code> dentro un template literal converte <code>'42'</code> in <code>42</code>.
          Limite ricorsione: circa 50 livelli (1000 se la chiamata ricorsiva è in coda), poi TS2589.
        </p>
      </sbu-example>

      <sbu-example [n]="12" title="Template literal types: eventi tipizzati" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="emitLogin()">emit('userLogin')</button>
          <button type="button" class="btn" (click)="emitCart()">emit('cartUpdated')</button>
          <button type="button" class="btn" (click)="emitLogout()">emit('userLogout')</button>
        </div>
        <ol role="log" class="mt-3 max-h-32 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          @for (line of eventLog(); track $index) {
            <li>{{ line }}</li>
          }
        </ol>
        <sbu-code [code]="code.templateLiteral" />
        <p note>
          Le union nei template literal producono il prodotto cartesiano. <code>Uppercase</code>,
          <code>Lowercase</code>, <code>Capitalize</code>, <code>Uncapitalize</code> sono intrinseci (implementati nel
          compilatore). Trappola: un'<code>interface</code> non è assegnabile a <code>Record&lt;string, …&gt;</code>
          (manca l'index signature implicita), un <code>type</code> sì.
        </p>
      </sbu-example>

      <sbu-example [n]="13" title="Parametri di rotta estratti dal path" level="avanzato">
        <div class="flex flex-wrap gap-3">
          <label class="flex flex-col gap-1 text-sm">
            id
            <input #idInput class="field w-32" [value]="routeId()" (input)="routeId.set(idInput.value)" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            postId
            <input #postIdInput class="field w-32" [value]="routePostId()" (input)="routePostId.set(postIdInput.value)" />
          </label>
        </div>
        <p class="mt-2 text-sm" aria-live="polite">buildRoute → <code>{{ route() }}</code></p>
        <sbu-code [code]="code.route" />
        <p note>
          Il path deve essere un letterale: con un <code>string</code> generico <code>RouteParams</code> diventa
          <code>&#123;&#125;</code> e non controlla nulla. I valori sono passati da <code>encodeURIComponent</code>
          (prova uno spazio o "/").
        </p>
      </sbu-example>

      <sbu-example [n]="14" title="Tipi ricorsivi: DeepPartial, DeepReadonly, Json, Paths" level="avanzato">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Percorso da leggere">
          @for (path of settingsPaths; track path) {
            <button type="button" class="btn" [attr.aria-pressed]="settingsPath() === path" (click)="settingsPath.set(path)">
              {{ path }}
            </button>
          }
        </div>
        <p class="mt-2 text-sm" aria-live="polite">
          getPath(settings, '{{ settingsPath() }}') → <code>{{ settingsValue() | json }}</code>
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="patchSettings(darkPatch)">mergeDeep: tema scuro</button>
          <button type="button" class="btn" (click)="patchSettings(weeklyPatch)">mergeDeep: digest settimanale</button>
          <button type="button" class="btn" (click)="settings.set(defaultSettings)">Reset</button>
        </div>
        <p class="mt-2 text-sm">Default congelati (deepFreeze): <strong>{{ defaultsFrozen }}</strong></p>
        <sbu-code [code]="code.recursive" />
        <p note>
          Le funzioni sono <code>object</code>: escludile prima di mapparle. Un mapped type omomorfo su un array produce un
          array (<code>readonly string[]</code>). <code>Paths</code> usa un contatore (<code>PreviousDepth</code>) per
          fermarsi su tipi ciclici: senza, errore TS2589. <code>undefined</code> e <code>Date</code> non sono
          <code>Json</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="15" title="Prettify, UnionToIntersection, IsAny, IsNever, brand" level="avanzato">
        <label class="flex flex-col gap-1 text-sm">
          Email (string → Email solo dopo validazione)
          <input #emailInput class="field max-w-xs" type="email" [value]="emailText()" (input)="emailText.set(emailInput.value)" />
        </label>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" class="btn" [disabled]="!email()" (click)="sendWelcomeEmail()">sendWelcome(email)</button>
          <span class="text-sm" aria-live="polite">{{ welcome() }}</span>
        </div>
        <p class="mt-3 text-sm">mergeAll(&#123; id &#125;, &#123; name &#125;, &#123; admin &#125;) → <code>{{ merged | json }}</code></p>
        <sbu-code [code]="code.helpers" />
        <p note>
          Un brand è un'intersezione con una proprietà fittizia (<code>unique symbol</code>): zero costo a runtime, tipi
          nominali in compilazione. <code>UnionToIntersection</code> sfrutta l'inferenza in posizione controvariante.
          <code>IsNever</code> richiede la tupla; <code>IsAny</code> sfrutta che solo <code>any</code> assorbe
          <code>1 &amp; T</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="16" title="Come li usa Angular: Signal, InputSignal, typed forms, ResolveFn" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="fillProfile()">patchValue</button>
          <button type="button" class="btn" (click)="toggleEmail()">Abilita/disabilita email</button>
          <button type="button" class="btn" (click)="resetProfile()">reset()</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>form.value</dt>
          <dd><code>{{ formState().value | json }}</code></dd>
          <dt>getRawValue()</dt>
          <dd><code>{{ formState().raw | json }}</code></dd>
          <dt>readSignals(…)</dt>
          <dd><code>{{ signalsSnapshot() | json }}</code></dd>
        </dl>
        <sbu-code [code]="code.angular" />
        <p note>
          <code>form.value</code> è <code>Partial</code> perché esclude i controlli disabilitati; <code>getRawValue()</code>
          li include. Senza <code>nonNullable</code> un <code>FormControl('')</code> è <code>string | null</code> (reset
          → null). Gli alias <code>ɵ…</code> sono API private: studiale, non importarle nel codice applicativo.
          <code>ResolveFn&lt;T&gt;</code> può restituire valore, Observable o Promise.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class TypescriptTypesPage {
  protected readonly code = CODE;

  // 1. keyof, typeof
  protected readonly roles = ROLES;
  protected readonly selectedRole = signal<Role>('editor');
  protected readonly permissions = computed(() => permissionsOf(this.selectedRole()));
  protected readonly roleText = signal('owner');
  protected readonly roleCheck = computed(() => {
    const value = this.roleText();
    return isRole(value) ? `true: '${value}' è un Role` : `false: '${value}' resta string`;
  });

  // 2. utility per oggetti
  protected readonly objectDemo = signal(this.describe('product', PRODUCT));

  // 3. utility per union
  protected readonly readingsLabel = READINGS.map(String).join(', ');
  protected readonly presentReadings = READINGS.filter(isPresent);

  // 4. funzioni e classi
  protected readonly functionLog = signal<readonly string[]>([]);
  private readonly loggedDiscount = withLogging(discount, (line) => this.functionLog.update((log) => [...log, line]));

  // 5. this
  protected readonly euroPrice = formatEur(1234.5);
  protected readonly dollarPrice = formatUsd(1234.5);
  private readonly counter = defineModel({
    data: { count: 0 },
    methods: {
      increment() {
        return ++this.count;
      },
    },
  });
  protected readonly modelCount = signal(this.counter.count);

  // 6. NoInfer
  protected readonly wantedSize = signal('XL');
  protected readonly chosenSize = computed(() => chooseOption(SIZES, this.wantedSize().trim().toUpperCase(), 'M'));

  // 7. generici
  protected readonly accountKeys = ACCOUNT_KEYS;
  protected readonly accountKey = signal<(typeof ACCOUNT_KEYS)[number]>('address');
  protected readonly accountValue = computed(() => getProp(ACCOUNT, this.accountKey()));
  protected readonly tabs = TABS;
  protected readonly activeTab = signal<Tab>('profilo');

  // 9. mapped types
  protected readonly groupKeys = GROUP_KEYS;
  protected readonly groupKey = signal<(typeof GROUP_KEYS)[number]>('team');
  protected readonly groups = computed(() =>
    Object.entries(groupBy(EMPLOYEES, this.groupKey())).map(([key, employees]) => ({
      key,
      names: (employees ?? []).map((employee) => employee.name).join(', '),
    })),
  );
  protected readonly firstEmployeeName = toGetters(EMPLOYEES[0]).getName();

  // 10. conditional types
  protected readonly parseKinds = PARSE_KINDS;
  protected readonly parseKind = signal<ParseKind>('list');
  protected readonly rawValue = signal('angular, typescript, rxjs');
  protected readonly parsed = computed(() => parseAs(this.parseKind(), this.rawValue()));

  // 11. infer
  protected readonly ageText = signal('42');
  protected readonly ageResult = computed(() => parseAge(this.ageText()));

  // 12. template literal: emitter
  protected readonly eventLog = signal<readonly string[]>([]);
  private readonly events = createEmitter<AppEvents>();

  // 13. route params
  protected readonly routeId = signal('7');
  protected readonly routePostId = signal('42');
  protected readonly route = computed(() =>
    buildRoute('/users/:id/posts/:postId', { id: this.routeId(), postId: this.routePostId() }),
  );

  // 14. tipi ricorsivi
  protected readonly defaultSettings = DEFAULT_SETTINGS;
  protected readonly darkPatch = DARK_PATCH;
  protected readonly weeklyPatch = WEEKLY_PATCH;
  protected readonly settingsPaths = SETTINGS_PATHS;
  protected readonly settings = signal<DeepReadonly<Settings>>(DEFAULT_SETTINGS);
  protected readonly settingsPath = signal<(typeof SETTINGS_PATHS)[number]>('theme.mode');
  protected readonly settingsValue = computed(() => getPath(this.settings(), this.settingsPath()));
  protected readonly defaultsFrozen = Object.isFrozen(DEFAULT_SETTINGS.notifications.email);

  // 15. helper e brand
  protected readonly emailText = signal('ada@example');
  protected readonly email = computed(() => toEmail(this.emailText()));
  protected readonly welcome = signal('');
  protected readonly merged = mergeAll({ id: 7 }, { name: 'Ada' }, { admin: true });

  // 16. Angular
  private readonly profileForm = createProfileForm();
  protected readonly formState = signal(this.readForm());
  protected readonly signalsSnapshot = computed(() =>
    readSignals({ ruolo: this.selectedRole, tab: this.activeTab, email: this.email }),
  );

  constructor() {
    this.events.on('userLogin', ({ name }) => this.logEvent('userLogin', `benvenuto ${name}`));
    this.events.on('userLogout', ({ reason }) => this.logEvent('userLogout', `motivo: ${reason}`));
    this.events.on('cartUpdated', ({ items }) => this.logEvent('cartUpdated', `${items} articoli`));
  }

  // 2.
  protected showPick(): void {
    this.objectDemo.set(this.describe("pick(product, 'id', 'name')", pick(PRODUCT, 'id', 'name')));
  }

  protected showOmit(): void {
    this.objectDemo.set(this.describe("omit(product, 'description')", omit(PRODUCT, 'description')));
  }

  protected showPatch(): void {
    this.objectDemo.set(this.describe('applyPatch(product, { price: 39.9 })', applyPatch(PRODUCT, { price: 39.9 })));
  }

  protected showUndefinedPatch(): void {
    this.objectDemo.set(
      this.describe('applyPatch(product, { price: undefined }) — compila!', applyPatch(PRODUCT, { price: undefined })),
    );
  }

  /** JSON.stringify scarterebbe le chiavi undefined: le rendiamo visibili. */
  private describe(label: string, value: object): { label: string; json: string } {
    const json = JSON.stringify(value, (_, field: unknown) => (field === undefined ? '«undefined»' : field), 2);
    return { label, json };
  }

  // 4.
  protected runDiscount(): void {
    this.loggedDiscount(80, 25);
  }

  protected createMoney(): void {
    const money = create(Money, 42.5, 'USD');
    this.functionLog.update((log) => [...log, `create(Money, 42.5, 'USD') → ${money.toString()}`]);
  }

  // 5.
  protected incrementModel(): void {
    this.modelCount.set(this.counter.increment());
  }

  // 12.
  protected emitLogin(): void {
    this.events.emit('userLogin', { name: 'Ada' });
  }

  protected emitCart(): void {
    this.events.emit('cartUpdated', { items: this.eventLog().length + 1 });
  }

  protected emitLogout(): void {
    this.events.emit('userLogout', { reason: 'manuale' });
  }

  private logEvent(event: keyof AppEvents, detail: string): void {
    this.eventLog.update((log) => [...log, `${handlerName(event)} → ${detail}`]);
  }

  // 14.
  protected patchSettings(patch: DeepPartial<Settings>): void {
    this.settings.update((current) => mergeDeep(current, patch));
  }

  // 15.
  protected sendWelcomeEmail(): void {
    const email = this.email();
    if (email) this.welcome.set(sendWelcome(email));
  }

  // 16.
  protected fillProfile(): void {
    this.profileForm.patchValue({ name: 'Ada', email: 'ada@example.com', newsletter: true });
    this.formState.set(this.readForm());
  }

  protected toggleEmail(): void {
    const email = this.profileForm.controls.email;
    if (email.enabled) {
      email.disable();
    } else {
      email.enable();
    }
    this.formState.set(this.readForm());
  }

  protected resetProfile(): void {
    this.profileForm.reset();
    this.formState.set(this.readForm());
  }

  private readForm() {
    return { value: this.profileForm.value, raw: this.profileForm.getRawValue() };
  }
}
