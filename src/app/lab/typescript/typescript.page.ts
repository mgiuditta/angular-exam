import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import {
  describeValue,
  fallbacks,
  normalizeSettings,
  THEMES,
  userInitial,
  type Falsyish,
  type Settings,
  type ThemeName,
} from './basics';
import { toEmail, welcomeMessage } from './brands';
import { BankAccount, Calculator, Contractor, Developer, runtimeView, Stack, runWithUsing } from './classes';
import type { Movement } from './classes';
import { directionArrow, enumKeys, Priority, ROLE, Status } from './enums';
import { buildLabel, createMachine, describeCounter, OPERATIONS, parseInput } from './functions';
import {
  area,
  checkWithAssertion,
  checkWithPredicate,
  narrowInput,
  PAYLOADS,
  SHAPES,
  trustWithAs,
  type Input,
  type PayloadName,
  type Shape,
} from './narrowing';
import {
  DEFAULT_USER,
  distanceFromOrigin,
  formatId,
  getProperty,
  POINT_3D,
  translate,
  TRANSLATIONS_IT,
  USER_KEYS,
  withAudit,
  type UserKey,
} from './objects';
import { concatTuples, parseRange, rangeLength } from './tuples';

interface Labeled<T> {
  readonly label: string;
  readonly value: T;
}

interface AccountView {
  readonly balance: number;
  readonly movements: readonly Movement[];
  readonly json: string;
  readonly error: string;
}

const UNKNOWN_SAMPLES: readonly Labeled<unknown>[] = [
  { label: "'ciao'", value: 'ciao' },
  { label: '42', value: 42 },
  { label: 'NaN', value: Number.NaN },
  { label: '10n', value: 10n },
  { label: 'true', value: true },
  { label: 'null', value: null },
  { label: 'undefined', value: undefined },
  { label: '[1, 2, 3]', value: [1, 2, 3] },
  { label: '{ a: 1 }', value: { a: 1 } },
  { label: "Symbol('id')", value: Symbol('id') },
];

const FALSYISH_SAMPLES: readonly Labeled<Falsyish>[] = [
  { label: '0', value: 0 },
  { label: "''", value: '' },
  { label: 'false', value: false },
  { label: 'null', value: null },
  { label: 'undefined', value: undefined },
  { label: "'testo'", value: 'testo' },
];

const SETTINGS_PRESETS: readonly Labeled<Settings>[] = [
  { label: 'Oggetto vuoto', value: {} },
  { label: 'Valori falsy', value: { pageSize: 0, title: '', user: null } },
  { label: 'Completo', value: { pageSize: 50, title: 'Report', user: { name: '  grace  ' } } },
];

const NARROWING_INPUTS: readonly Labeled<Input>[] = [
  { label: "'Angular'", value: 'Angular' },
  { label: "''", value: '' },
  { label: '21', value: 21 },
  { label: "['a', 'b']", value: ['a', 'b'] },
  { label: 'new Date(…)', value: new Date(Date.UTC(2026, 0, 15)) },
  { label: "{ label: 'ok' }", value: { label: 'ok' } },
  { label: 'null', value: null },
  { label: 'undefined', value: undefined },
];

const CODE = {
  topTypes: ts`
    function describeValue(value: unknown): string {
      if (value === null) return 'null';                 // typeof null === 'object'!
      switch (typeof value) {
        case 'string': return \`string di \${value.length} caratteri\`;
        case 'number': return \`number \${value.toFixed(2)}\`;
        case 'object': return Object.keys(value).join(', ');   // value: object
        default:       return typeof value;
      }
    }

    declare const a: any;     a.qualsiasi.cosa;        // ok: nessun controllo
    declare const u: unknown; u.qualsiasi;             // ❌ prima restringi
    const n: number = u;                               // ❌ unknown → solo unknown/any

    function fail(msg: string): never { throw new Error(msg); }
    function log(): void {}                            // ritorna, ma senza valore utile

    type A = string | never;     // string   (never sparisce nelle unioni)
    type B = string | unknown;   // unknown  (unknown assorbe)
  `,
  nullish: ts`
    const x: string = null;                  // ❌ strictNullChecks

    value || 'default'                        // scarta 0, '', false, NaN, null, undefined
    value ?? 'default'                        // scarta SOLO null e undefined

    settings.pageSize ??= 20;                 // assegna se null/undefined
    settings.title ||= 'Senza titolo';        // assegna se falsy
    settings.user &&= { name: settings.user.name.trim() };  // assegna se truthy

    settings.user?.name.at(0)?.toUpperCase()  // string | undefined
  `,
  literals: ts`
    let a = 'ciao';                  // string   (widening)
    const b = 'ciao';                // 'ciao'
    const o = { mode: 'dark' };      // { mode: string }
    const c = { mode: 'dark' } as const;   // { readonly mode: 'dark' }

    const THEMES = {
      chiaro: { background: '#ffffff', foreground: '#111827', radius: 8 },
      scuro:  { background: '#111827', foreground: '#f9fafb', radius: 'full' },
    } satisfies Record<string, Theme>;

    type ThemeName = keyof typeof THEMES;    // 'chiaro' | 'scuro'
    THEMES.scuro.radius                      // 'full' (letterale preservato)

    const annotated: Record<string, Theme> = THEMES;   // chiavi perse: string
    const asserted = { background: '#fff' } as Theme;  // nessun errore, mancano proprietà!
  `,
  unionIntersection: ts`
    type Id = string | number;
    function formatId(id: Id) {
      id.toFixed();                                   // ❌ non esiste su string
      return typeof id === 'number' ? \`#\${id}\` : id.toUpperCase();
    }

    function withAudit<T extends object>(entity: T, by: string, at: string): T & Audited {
      return { ...entity, updatedBy: by, updatedAt: at };
    }

    type A = { id: string; name: string };
    type B = { id: number; active: boolean };
    keyof (A | B)      // 'id'                         solo chiavi comuni
    keyof (A & B)      // 'id' | 'name' | 'active'     tutte le chiavi
    (A & B)['id']      // never                        conflitto silenzioso
  `,
  typeVsInterface: ts`
    interface Entity { readonly id: number }
    interface Product extends Entity { readonly name: string }
    interface Product { readonly sku: string }        // declaration merging → Product ha anche sku

    interface Broken extends Entity { id: string }    // ❌ extends verifica i conflitti

    type Status = 'draft' | 'published';              // unioni, tuple, primitivi: solo type
    type Pair = [Product, Status];
    type Product2 = Entity & { name: string };        // "extends" con type: intersezione (conflitti → never)

    // estendere tipi globali/di libreria: solo interface
    declare global { interface Window { appVersion: string } }
  `,
  modifiers: ts`
    interface Translations {
      readonly locale: string;                // dichiarata
      readonly [key: string]: string;         // index signature
    }

    dict.locale                               // ok
    dict.save                                 // ❌ noPropertyAccessFromIndexSignature
    dict['save']                              // ok: string (NON string | undefined!)

    interface Product { readonly tags?: readonly string[] }
    product.tags                              // readonly string[] | undefined
    list.push('x')                            // ❌ readonly string[] = ReadonlyArray<string>
    const m: string[] = readonlyList;         // ❌ readonly → mutabile non è assegnabile

    const n: { readonly inner: { value: number } } = …;
    n.inner.value = 2;                        // ok: readonly è SHALLOW
  `,
  tuples: ts`
    type Range = readonly [start: number, end: number];            // etichette + readonly
    type Rgb = [red: number, green: number, blue: number, alpha?: number];  // length: 3 | 4
    type Row = [id: number, ...cells: string[]];                   // rest

    function parseRange(text: string): Range | null { … }
    function rangeLength([start, end]: Range) { return end - start + 1; }

    function concatTuples<A extends readonly unknown[], B extends readonly unknown[]>(
      a: readonly [...A], b: readonly [...B],
    ): [...A, ...B] { return [...a, ...b]; }

    concatTuples([1, 'due'], [true]);   // [number, string, boolean]
    const arr = [1, 5];                 // number[]: senza annotazione non è una tupla
  `,
  structural: ts`
    interface Point { readonly x: number; readonly y: number }
    const POINT_3D = { x: 3, y: 4, z: 12 };

    distanceFromOrigin(POINT_3D);                 // ok: ha x e y (la forma conta, non il nome)
    distanceFromOrigin({ x: 3, y: 4, z: 12 });    // ❌ excess property check (solo letterali "freschi")

    class Meters  { constructor(readonly value: number) {} }
    class Seconds { constructor(readonly value: number) {} }
    const t: Seconds = new Meters(5);             // ok! stessa forma

    interface Options { verbose?: boolean }       // weak type: tutte opzionali
    const config = { verbos: true };
    const o: Options = config;                    // ❌ nessuna proprietà in comune (anche senza letterale)

    const e: {} = 42;                // ok: {} = tutto tranne null/undefined
    const o2: object = 42;           // ❌ object = solo non primitivi
    const w: Object = { toString: 1 };   // ❌ Object controlla i membri di Object.prototype
  `,
  keyof: ts`
    const DEFAULT_USER = { name: 'Ada', role: 'admin', loginCount: 3, active: true };

    type User = typeof DEFAULT_USER;      // typeof in posizione di tipo
    type UserKey = keyof User;            // 'name' | 'role' | 'loginCount' | 'active'
    type NameOrActive = User['name' | 'active'];   // string | boolean
    type Item = (typeof USER_KEYS)[number];        // tipo degli elementi di un array

    function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
      return obj[key];
    }
    getProperty(DEFAULT_USER, 'loginCount');  // number
    getProperty(DEFAULT_USER, 'email');       // ❌
  `,
  enums: ts`
    enum Priority { Low, Medium, High = 10, Critical }   // 0, 1, 10, 11
    Priority[Priority.High]           // 'High' (reverse mapping, solo numerici)
    const p: Priority = 42;           // ❌ da TS 5.0

    enum Status { Draft = 'DRAFT', Published = 'PUBLISHED' }
    const s: Status = 'DRAFT';        // ❌ enum stringa = nominale

    const enum Direction { Up = 'UP', Down = 'DOWN' }   // inlinato; con isolatedModules evitalo tra file
    Direction[0];                     // ❌ nessun oggetto a runtime

    type Theme = 'light' | 'dark';    // unione di letterali: zero runtime
    const ROLE = { Admin: 'admin', Editor: 'editor' } as const;
    type Role = (typeof ROLE)[keyof typeof ROLE];   // 'admin' | 'editor'
  `,
  functions: ts`
    function buildLabel(text: string, suffix?: string, separator = ' · ', ...tags: string[]) { … }

    type Operation = (a: number, b: number) => number;
    const OPERATIONS = {
      somma: (a, b) => a + b,          // parametri tipizzati dal contesto
      massimo: Math.max,
    } satisfies Record<string, Operation>;
    const op: Operation = (a) => a;    // ok: meno parametri
    const bad: Operation = (a, b, c) => 0;   // ❌ di più no

    function parseInput(value: string): number;                // overload
    function parseInput(value: readonly string[]): number[];   // overload
    function parseInput(value: string | readonly string[]) { … }   // implementazione (invisibile)

    function describeCounter(this: Counter, label: string) { return \`\${label}: \${this.count}\`; }
    describeCounter.call({ count: 3 }, 'click');

    const cb: (n: number) => void = (n) => list.push(n);   // ok: il ritorno viene ignorato
    function f(): void { return 42; }                       // ❌ dichiarazione esplicita
  `,
  generics: ts`
    function longest<T extends { readonly length: number }>(a: T, b: T): T { … }
    longest('ab', 'abc');             // 'ab' | 'abc'
    longest<string>('ab', 'abc');     // string (type argument esplicito)
    longest(1, 2);                    // ❌ vincolo

    interface Paginated<T = string> { items: readonly T[]; total: number }   // default

    function createMachine<const S extends readonly string[]>(states: S, initial: NoInfer<S[number]>) { … }
    const m = createMachine(['idle', 'loading', 'success', 'error'], 'idle');
    m.states                          // readonly ['idle', 'loading', 'success', 'error']
    createMachine(['idle'], 'done');  // ❌ NoInfer: 'done' non allarga S
  `,
  narrowing: ts`
    function narrowInput(input: string | number | readonly string[] | Date | { label: string } | null | undefined) {
      if (input == null) return '…';              // uguaglianza: null E undefined
      if (typeof input === 'string') return input ? '…' : 'vuota';   // typeof + truthiness
      if (typeof input === 'number') return '…';
      if (input instanceof Date) return '…';      // instanceof
      if ('label' in input) return input.label;   // in
      return input.join(', ');                    // resta: readonly string[]
    }

    const isCircle = shape.kind === 'circle';     // condizione in una costante (TS 4.4)
    if (isCircle) shape.radius;

    values.filter((v) => v !== undefined);        // number[]: inferred type predicate (TS 5.5)
  `,
  discriminated: ts`
    type Shape =
      | { kind: 'circle'; radius: number }
      | { kind: 'square'; side: number }
      | { kind: 'rectangle'; width: number; height: number };

    function area(shape: Shape): number {
      switch (shape.kind) {
        case 'circle':    return Math.PI * shape.radius ** 2;
        case 'square':    return shape.side ** 2;
        case 'rectangle': return shape.width * shape.height;
        default:          return assertNever(shape);   // shape: never
      }
    }

    function assertNever(value: never): never {
      throw new Error(\`Caso non gestito: \${JSON.stringify(value)}\`);
    }
  `,
  predicates: ts`
    function isUser(value: unknown): value is User {
      return typeof value === 'object' && value !== null
        && 'name' in value && typeof value.name === 'string'   // \`in\` aggiunge la proprietà (TS 4.9)
        && 'age' in value && typeof value.age === 'number';
    }

    function assertIsUser(value: unknown): asserts value is User {
      if (!isUser(value)) throw new TypeError('Non è un User valido');
    }

    const data: unknown = JSON.parse(json);
    if (isUser(data)) data.name;        // narrowing nel ramo
    assertIsUser(data);  data.name;     // narrowing da qui in poi

    const assertArrow = (v: unknown): asserts v is User => …;
    assertArrow(x);   // ❌ serve un'annotazione esplicita sulla variabile
  `,
  assertions: ts`
    const user = JSON.parse(json) as User;   // nessuna verifica: il bug esplode dopo
    user.age + 10;                            // "36" + 10 = "3610"

    'testo' as number;                        // ❌ tipi senza sovrapposizione
    'testo' as unknown as number;             // doppia asserzione: passa tutto

    maybe!.length;                            // non-null assertion: toglie null/undefined

    class Form { name!: string; }             // definite assignment: "verrà inizializzato"
    let later!: number;
    callback(() => (later = 1));
    later.toFixed();
  `,
  classes: ts`
    class BankAccount {
      static #created = 0;
      static readonly currency = 'EUR';       // tipo 'EUR'

      readonly #movements: Movement[] = [];   // privato JS: invisibile a runtime
      private balance = 0;                    // privato TS: solo compile time
      protected readonly createdAt: number;

      constructor(readonly owner: string, public iban: string) {   // parameter properties
        this.createdAt = ++BankAccount.#created;
      }

      get movements(): readonly Movement[] { return this.#movements; }   // getter senza setter
    }

    account.balance        // ❌ private…
    account['balance']     // …ma così compila (escape hatch)
    JSON.stringify(account)   // contiene balance, owner, iban; NON #movements

    class Wrong {
      constructor(private base: number) {}
      doubled = this.base * 2;   // ❌ used before initialization (field prima del costruttore)
    }
  `,
  inheritance: ts`
    abstract class Employee implements Describable {
      constructor(readonly name: string) {}
      abstract monthlyCost(): number;
      describe() { return \`\${this.name}: \${this.monthlyCost()} €/mese\`; }
    }

    class Developer extends Employee {
      #level = 1;
      constructor(name: string, private readonly salary: number) { super(name); }
      get level(): number { return this.#level; }
      set level(value: number | string) { this.#level = Math.min(3, Number(value)); }   // TS 5.1
      override monthlyCost() { … }            // noImplicitOverride → override obbligatorio
      override describe() { return \`\${super.describe()} (livello \${this.level})\`; }
    }

    new Employee('Ada');                      // ❌ abstract

    class Stack<T> {
      readonly #items: T[] = [];
      push(item: T): this { this.#items.push(item); return this; }
      pop(): T | undefined { return this.#items.pop(); }
    }
    new Stack<number>().push(1).push('2');   // ❌
  `,
  modules: ts`
    import type { Settings } from './basics';                // sparisce nel JS
    import { describeValue, type Falsyish } from './basics'; // modificatore inline

    export type { Shape } from './narrowing';   // re-export di un tipo
    export { Shape } from './narrowing';        // ❌ isolatedModules: serve \`export type\`

    // isolatedModules = ogni file va transpilato DA SOLO (esbuild, Vite, Angular CLI):
    // - re-export di tipi → export type
    // - const enum importati non si possono inlinare
    // - ogni file deve essere un modulo (almeno un import/export)
  `,
  decorators: ts`
    // tsconfig.json: "experimentalDecorators": true   (richiesto da Angular)
    function logCalls(target: { readonly calls: string[] }, key: string, descriptor: PropertyDescriptor) {
      const original = descriptor.value;
      descriptor.value = function (this: { readonly calls: string[] }, ...args: unknown[]) {
        const result = original.apply(this, args);
        this.calls.push(\`\${key}(\${args.join(', ')}) → \${result}\`);
        return result;
      };
    }

    class Calculator {
      readonly calls: string[] = [];
      @logCalls add(a: number, b: number) { return a + b; }
    }

    // Standard TC39 (senza flag): function dec(value, context: ClassMethodDecoratorContext) { … }
    // niente decoratori di parametro → Angular: @Inject/@Optional solo con experimentalDecorators
  `,
  using: ts`
    class Connection implements Disposable {
      constructor(private name: string, private log: string[]) { log.push(\`apro \${name}\`); }
      query(sql: string) { this.log.push(\`\${this.name}: \${sql}\`); }
      [Symbol.dispose]() { this.log.push(\`chiudo \${this.name}\`); }
    }

    try {
      using connection = new Connection('db', log);
      connection.query('SELECT 1');
      if (shouldThrow) throw new Error('query fallita');
    } catch (error) { … }   // "chiudo db" è già nel log: dispose avviene PRIMA del catch

    // asincrono: await using + [Symbol.asyncDispose]()
  `,
  brands: ts`
    declare const brand: unique symbol;                 // solo tipo: nessun codice generato
    type Brand<T, B extends string> = T & { readonly [brand]: B };
    type Email = Brand<string, 'Email'>;

    function toEmail(value: string): Email | null {     // "smart constructor"
      return EMAIL_REGEX.test(value) ? (value as Email) : null;
    }
    function welcomeMessage(to: Email) { … }

    welcomeMessage('ada@example.com');   // ❌ string non è Email
    const s: string = email;             // ok verso il tipo base

    const ROLE_KEY: unique symbol = Symbol('role');     // richiede const
    let k: unique symbol = Symbol();     // ❌
  `,
};

/**
 * Pagina: TYPESCRIPT, FONDAMENTA DEL LINGUAGGIO
 *
 * Ogni esempio ha un file .ts nella cartella con le affermazioni verificate dal compilatore
 * (`Expect<Equal<…>>` e `// @ts-expect-error`): se una regola cambiasse, la build fallirebbe.
 *
 * Checklist certificazione:
 * - unknown (sicuro, va ristretto) vs any (spegne i controlli); never = non ritorna / caso impossibile; void.
 * - `let` allarga, `const` e `as const` no; `satisfies` verifica senza perdere il tipo inferito, `as` non verifica.
 * - `??` vs `||`: 0 e '' sono falsy ma non nullish.
 * - interface: extends con controllo dei conflitti + declaration merging; type: unioni, tuple, mapped types.
 * - `noPropertyAccessFromIndexSignature`: chiavi della firma solo con ['…']; readonly è shallow e solo compile time.
 * - tipizzazione strutturale; l'excess property check vale solo per i letterali freschi.
 * - enum numerici = reverse mapping; enum stringa = nominali; alternative: unione di letterali / `as const`.
 * - overload: l'implementazione non è chiamabile; `this` come parametro finto; `() => void` accetta ritorni.
 * - generici: vincoli, default, `const T` (5.0), `NoInfer` (5.4).
 * - narrowing: typeof/in/instanceof/==null, discriminated union + `never`, `x is T`, `asserts x is T`.
 * - classi: private (TS) vs #private (JS), parameter properties, override obbligatorio, ordine dei field.
 * - moduli: `import type`/`export type` con isolatedModules; Angular usa `experimentalDecorators`.
 */
@Component({
  selector: 'sbu-typescript-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock],
  template: `
    <sbu-lab-page heading="TypeScript: fondamenta">
      <span intro>
        Il linguaggio che sta sotto ad Angular: tipi, narrowing, funzioni, classi e moduli. Le demo mostrano l'effetto a
        runtime; le regole sui tipi sono verificate dal compilatore nei file <code>.ts</code> della cartella.
      </span>

      <sbu-example [n]="1" title="Primitivi, any, unknown, never, void">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Valore da descrivere">
          @for (sample of unknownSamples; track sample.label) {
            <button type="button" class="btn" [attr.aria-pressed]="unknownSample() === sample" (click)="unknownSample.set(sample)">
              <code>{{ sample.label }}</code>
            </button>
          }
        </div>
        <p class="mt-3 text-sm" aria-live="polite">
          <code>describeValue({{ unknownSample().label }})</code> → {{ valueDescription() }}
        </p>
        <sbu-code [code]="code.topTypes" />
        <p note>
          <code>unknown</code> accetta tutto ma non permette nulla finché non restringi; <code>any</code> disattiva i
          controlli e si propaga. <code>never</code> è il bottom type (sparisce nelle unioni), <code>void</code> indica
          "nessun valore utile". <code>typeof null === 'object'</code> e <code>Array.isArray</code> restituisce
          <code>any[]</code>. Primitivi: string, number, boolean, bigint, symbol, null, undefined (mai
          <code>String</code>/<code>Number</code> maiuscoli).
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="null, undefined e operatori ?. ?? ??= ||= &&=">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Valore di partenza">
          @for (sample of falsyishSamples; track sample.label) {
            <button type="button" class="btn" [attr.aria-pressed]="falsyish() === sample" (click)="falsyish.set(sample)">
              <code>{{ sample.label }}</code>
            </button>
          }
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt><code>{{ falsyish().label }} || 'default'</code></dt>
          <dd>{{ fallbackResult().or }}</dd>
          <dt><code>{{ falsyish().label }} ?? 'default'</code></dt>
          <dd>{{ fallbackResult().nullish }}</dd>
        </dl>
        <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Impostazioni da normalizzare">
          @for (preset of settingsPresets; track preset.label) {
            <button type="button" class="btn" [attr.aria-pressed]="settingsPreset() === preset" (click)="settingsPreset.set(preset)">
              {{ preset.label }}
            </button>
          }
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>input</dt>
          <dd><code>{{ settingsInput() }}</code></dd>
          <dt>normalizeSettings</dt>
          <dd><code>{{ settingsOutput() }}</code></dd>
          <dt>userInitial (?.)</dt>
          <dd>{{ settingsInitial() }}</dd>
        </dl>
        <sbu-code [code]="code.nullish" />
        <p note>
          Con <code>strict</code> (quindi <code>strictNullChecks</code>) null e undefined sono tipi separati: vanno
          dichiarati nell'unione e gestiti. <code>pageSize: 0</code> resta 0 con <code>??=</code>, mentre
          <code>title: ''</code> viene sostituito da <code>||=</code>. <code>?.</code> restituisce undefined anche se il
          valore era null.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="Letterali, widening, as const e satisfies" level="intermedio">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Tema">
          @for (name of themeNames; track name) {
            <button type="button" class="btn" [attr.aria-pressed]="themeName() === name" (click)="themeName.set(name)">
              {{ name }}
            </button>
          }
        </div>
        <div
          class="mt-3 border p-4 text-sm"
          [style.background]="theme().background"
          [style.color]="theme().foreground"
          [style.border-radius]="themeRadius()"
          aria-live="polite"
        >
          Tema <strong>{{ themeName() }}</strong>: radius <code>{{ theme().radius }}</code>
        </div>
        <sbu-code [code]="code.literals" />
        <p note>
          <code>satisfies</code> controlla la forma (typo e valori sbagliati sono errori) ma il tipo resta quello inferito:
          <code>keyof typeof THEMES</code> è <code>'chiaro' | 'scuro'</code>, così i bottoni qui sopra sono tipizzati.
          Con l'annotazione il tipo sarebbe <code>Record&lt;string, Theme&gt;</code>; con <code>as</code> nessuna verifica.
          Combinabili: <code>as const satisfies …</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Unione e intersezione">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="formattedId.set(formatId(7))">formatId(7)</button>
          <button type="button" class="btn" (click)="formattedId.set(formatId('kb-01'))">formatId('kb-01')</button>
          <button type="button" class="btn" (click)="saveAudited()">withAudit(prodotto)</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>string | number</dt>
          <dd>{{ formattedId() }}</dd>
          <dt>T &amp; Audited</dt>
          <dd><code>{{ audited() }}</code></dd>
        </dl>
        <sbu-code [code]="code.unionIntersection" />
        <p note>
          Unione = "uno dei tipi": disponibili solo i membri comuni, il resto dopo il narrowing. Intersezione = "tutti
          insieme": somma delle proprietà. Controintuitivo: <code>keyof</code> di un'unione è l'INTERSEZIONE delle chiavi.
          Proprietà in conflitto in un'intersezione diventano <code>never</code> senza errore.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="type vs interface" level="intermedio">
        <sbu-code [code]="code.typeVsInterface" />
        <p note>
          <code>interface</code>: solo forme di oggetti, <code>extends</code> segnala i conflitti, declaration merging
          (estensione di librerie e <code>Window</code>). <code>type</code>: tutto il resto (unioni, tuple, primitivi,
          mapped e conditional types). Una classe può fare <code>implements</code> di entrambi, purché il type sia una
          forma di oggetto. Regola pratica: interface per i contratti di oggetti, type per il resto.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="Opzionali, readonly, index signature">
        <label class="flex max-w-xs flex-col gap-1 text-sm">
          Chiave da tradurre (save, cancel, delete…)
          <input #keyInput class="field" [value]="translationKey()" (input)="translationKey.set(keyInput.value)" />
        </label>
        <p class="mt-3 text-sm" aria-live="polite">
          <code>translate(TRANSLATIONS_IT, '{{ translationKey() }}')</code> → {{ translation() }}
          <span class="text-muted-foreground">(locale: {{ locale }})</span>
        </p>
        <sbu-code [code]="code.modifiers" />
        <p note>
          <code>noPropertyAccessFromIndexSignature</code> è attivo in questo progetto: <code>dict.save</code> non compila,
          <code>dict['save']</code> sì. Senza <code>noUncheckedIndexedAccess</code> il tipo letto è <code>string</code>
          anche per chiavi inesistenti. <code>readonly</code> e <code>readonly T[]</code> valgono solo a compile time e
          sono shallow (a runtime serve <code>Object.freeze</code>). <code>prop?: T</code> in lettura è
          <code>T | undefined</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="Tuple: etichette, opzionali, rest, variadic, readonly" level="intermedio">
        <label class="flex max-w-xs flex-col gap-1 text-sm">
          Intervallo (es. 8-3)
          <input #rangeInput class="field" [value]="rangeText()" (input)="rangeText.set(rangeInput.value)" />
        </label>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>parseRange</dt>
          <dd><code>{{ rangeResult() }}</code></dd>
          <dt>concatTuples([1, 'due'], [true])</dt>
          <dd><code>{{ joinedTuple }}</code></dd>
        </dl>
        <sbu-code [code]="code.tuples" />
        <p note>
          Le etichette documentano ma non cambiano l'accesso (sempre per indice o destructuring). Un array letterale senza
          annotazione è <code>T[]</code>, non una tupla: servono annotazione, <code>as const</code> o un parametro
          <code>[...T]</code>. <code>Rgb['length']</code> è <code>3 | 4</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="Tipizzazione strutturale, excess property check, object vs {}" level="intermedio">
        <p class="text-sm">
          <code>distanceFromOrigin(POINT_3D)</code> con <code>POINT_3D = {{ point3d }}</code> →
          <strong>{{ distance }}</strong>
        </p>
        <sbu-code [code]="code.structural" />
        <p note>
          TypeScript confronta le FORME: due classi con gli stessi membri pubblici sono compatibili (i membri
          <code>private</code>/<code>#private</code> invece rendono le classi nominali). L'excess property check scatta solo
          sui letterali oggetto passati o assegnati direttamente. <code>&#123;&#125;</code> significa "non nullish", non
          "oggetto vuoto"; per "qualsiasi oggetto" usa <code>object</code> o <code>Record&lt;string, unknown&gt;</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="keyof, typeof e T['k']">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Chiave di User">
          @for (key of userKeys; track key) {
            <button type="button" class="btn" [attr.aria-pressed]="userKey() === key" (click)="userKey.set(key)">
              {{ key }}
            </button>
          }
        </div>
        <p class="mt-3 text-sm" aria-live="polite">
          <code>getProperty(DEFAULT_USER, '{{ userKey() }}')</code> → {{ property().value }}
          (<code>{{ property().type }}</code>)
        </p>
        <sbu-code [code]="code.keyof" />
        <p note>
          <code>typeof</code> ha due significati: in un'espressione è l'operatore JS (restituisce una stringa), in
          posizione di tipo estrae il tipo di un valore. <code>K extends keyof T</code> + <code>T[K]</code> lega la chiave
          al tipo del risultato. Mapped e conditional types sono nella pagina dedicata.
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="Enum vs unione di letterali vs as const" level="intermedio">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Priorità">
          @for (value of priorities; track value) {
            <button type="button" class="btn" [attr.aria-pressed]="priority() === value" (click)="priority.set(value)">
              {{ value }}
            </button>
          }
          <button type="button" class="btn" (click)="up.set(!up())">Direction: {{ direction() }}</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>Priority[{{ priority() }}]</dt>
          <dd><code>'{{ priorityName() }}'</code></dd>
          <dt>Object.keys(Priority)</dt>
          <dd><code>{{ priorityKeys }}</code></dd>
          <dt>Object.keys(Status)</dt>
          <dd><code>{{ statusKeys }}</code></dd>
          <dt>Object.values(ROLE)</dt>
          <dd><code>{{ roleValues }}</code></dd>
        </dl>
        <sbu-code [code]="code.enums" />
        <p note>
          Gli enum generano JavaScript: un enum numerico ha anche le chiavi inverse (<code>'0'</code>, <code>'1'</code>…),
          da filtrare se lo iteri. Gli enum stringa non accettano stringhe letterali. Con <code>isolatedModules</code> un
          <code>const enum</code> importato non può essere inlinato. Nei template Angular un'unione di letterali o un
          oggetto <code>as const</code> sono più semplici (l'enum va esposto come proprietà del componente).
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="Funzioni: parametri, tipi funzione, overload, this, void" level="intermedio">
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex flex-wrap gap-2" role="group" aria-label="Operazione su 6 e 7">
            @for (name of operationNames; track name) {
              <button type="button" class="btn" [attr.aria-pressed]="operation() === name" (click)="operation.set(name)">
                {{ name }}(6, 7)
              </button>
            }
          </div>
          <label class="flex flex-col gap-1 text-sm">
            Numeri separati da virgola
            <input #numbersInput class="field" [value]="numbersText()" (input)="numbersText.set(numbersInput.value)" />
          </label>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>OPERATIONS.{{ operation() }}(6, 7)</dt>
          <dd>{{ operationResult() }}</dd>
          <dt>parseInput(string)</dt>
          <dd><code>{{ parsed().single }}</code> (number)</dd>
          <dt>parseInput(string[])</dt>
          <dd><code>{{ parsed().list }}</code> (number[])</dd>
          <dt>describeCounter.call</dt>
          <dd>{{ parsed().counter }}</dd>
          <dt>buildLabel (rest)</dt>
          <dd>{{ label }}</dd>
        </dl>
        <sbu-code [code]="code.functions" />
        <p note>
          Il chiamante vede solo le firme di overload, mai l'implementazione; ordina gli overload dal più specifico. Un
          parametro opzionale non può precedere uno obbligatorio; un default sì (passando <code>undefined</code>). Tipo
          funzione con ritorno <code>void</code>: il valore restituito è permesso e ignorato (per questo
          <code>forEach(x =&gt; arr.push(x))</code> compila). <code>this: T</code> sparisce nel JS.
        </p>
      </sbu-example>

      <sbu-example [n]="12" title="Generici: vincoli, default, const, NoInfer" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="machineState.set(machine.next())">machine.next()</button>
        </div>
        <p class="mt-3 text-sm" aria-live="polite">
          Stato: <strong>{{ machineState() }}</strong> di <code>{{ machineStates }}</code>
        </p>
        <sbu-code [code]="code.generics" />
        <p note>
          Il vincolo <code>extends</code> limita cosa si può passare e cosa si può usare dentro. <code>const T</code> (TS
          5.0) evita di chiedere <code>as const</code> al chiamante (per le tuple serve un vincolo
          <code>readonly unknown[]</code>). <code>NoInfer</code> (TS 5.4) impedisce a un argomento di allargare
          l'inferenza. Se T compare "nudo" nel ritorno, i letterali non vengono allargati.
        </p>
      </sbu-example>

      <sbu-example [n]="13" title="Narrowing: typeof, truthiness, uguaglianza, in, instanceof" level="intermedio">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Valore da restringere">
          @for (sample of narrowingInputs; track sample.label) {
            <button type="button" class="btn" [attr.aria-pressed]="narrowingInput() === sample" (click)="narrowingInput.set(sample)">
              <code>{{ sample.label }}</code>
            </button>
          }
        </div>
        <p class="mt-3 text-sm" aria-live="polite">narrowInput → {{ narrowed() }}</p>
        <sbu-code [code]="code.narrowing" />
        <p note>
          <code>== null</code> copre null e undefined. La truthiness scarta anche <code>''</code> e <code>0</code>.
          <code>instanceof</code> funziona solo con classi (non con interface/type). <code>in</code> restringe le unioni di
          oggetti. Il narrowing su <code>let</code> dentro le closure regge solo se la variabile non viene riassegnata dopo
          (TS 5.4).
        </p>
      </sbu-example>

      <sbu-example [n]="14" title="Discriminated union ed exhaustiveness con never" level="intermedio">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Forma">
          @for (shape of shapes; track shape.kind) {
            <button type="button" class="btn" [attr.aria-pressed]="shape === selectedShape()" (click)="selectedShape.set(shape)">
              {{ shape.kind }}
            </button>
          }
        </div>
        <p class="mt-3 text-sm" aria-live="polite">
          <code>{{ shapeJson() }}</code> → area {{ shapeArea() }}
        </p>
        <sbu-code [code]="code.discriminated" />
        <p note>
          Il discriminante deve essere una proprietà con tipo letterale comune a tutti i membri. Nel
          <code>default</code> il valore è <code>never</code>: aggiungendo un membro all'unione senza gestirlo,
          <code>assertNever(shape)</code> non compila più. Stesso schema con <code>&#64;switch</code> nei template.
        </p>
      </sbu-example>

      <sbu-example [n]="15" title="Type predicate e assertion function" level="avanzato">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Payload JSON">
          @for (name of payloadNames; track name) {
            <button type="button" class="btn" [attr.aria-pressed]="checkedPayload() === name" (click)="checkedPayload.set(name)">
              {{ name }}
            </button>
          }
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>JSON</dt>
          <dd><code>{{ payloads[checkedPayload()] }}</code></dd>
          <dt>isUser (x is User)</dt>
          <dd>{{ predicateResult() }}</dd>
          <dt>assertIsUser (asserts)</dt>
          <dd>{{ assertionResult() }}</dd>
        </dl>
        <sbu-code [code]="code.predicates" />
        <p note>
          Il compilatore si FIDA del predicate: se la verifica è sbagliata, il tipo mente. Un predicate restituisce
          boolean; un'assertion function restituisce void e lancia. Le assertion function richiedono una dichiarazione
          <code>function</code> o una variabile con tipo esplicito. Da TS 5.5 i predicate semplici sono inferiti (es. in
          <code>filter</code>).
        </p>
      </sbu-example>

      <sbu-example [n]="16" title="Type assertion: as, doppia asserzione, ! e !:" level="intermedio">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Payload JSON">
          @for (name of payloadNames; track name) {
            <button type="button" class="btn" [attr.aria-pressed]="trustedPayload() === name" (click)="trustedPayload.set(name)">
              {{ name }}
            </button>
          }
        </div>
        <p class="mt-3 text-sm" aria-live="polite">
          <code>JSON.parse(…) as User</code> → {{ trustedResult() }}
        </p>
        <sbu-code [code]="code.assertions" />
        <p note>
          <code>as</code> non converte e non verifica: con "età stringa" il risultato è una concatenazione, con "senza
          nome" un TypeError lontano dalla causa. Consentito solo tra tipi che si sovrappongono (altrimenti
          <code>as unknown as T</code>). <code>!</code> e <code>!:</code> spengono i controlli su null e inizializzazione:
          usali solo quando sai qualcosa che il compilatore non può sapere.
        </p>
      </sbu-example>

      <sbu-example [n]="17" title="Classi: private vs #private, parameter properties, static" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="deposit()">deposit(50)</button>
          <button type="button" class="btn" (click)="withdraw()">withdraw(80)</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>currentBalance</dt>
          <dd>{{ accountView().balance }} {{ currency }}</dd>
          <dt>movements (#private)</dt>
          <dd>{{ accountView().movements.length }} movimenti</dd>
          <dt>JSON.stringify</dt>
          <dd><code>{{ accountView().json }}</code></dd>
          <dt>errore</dt>
          <dd>{{ accountView().error || '—' }}</dd>
          <dt>BankAccount.created</dt>
          <dd>{{ accountsCreated }}</dd>
        </dl>
        <sbu-code [code]="code.classes" />
        <p note>
          <code>private</code>/<code>protected</code> esistono solo per il compilatore (il JSON mostra
          <code>balance</code>); <code>#campo</code> è privato anche a runtime. Le parameter properties generano
          codice. Con target ES2022 (<code>useDefineForClassFields</code>) i field initializer girano prima del corpo del
          costruttore: in Angular <code>inject()</code> nei field è sicuro, leggere un parametro del costruttore no.
        </p>
      </sbu-example>

      <sbu-example [n]="18" title="abstract, implements, override, getter/setter, classi generiche" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="promote()">developer.level = '{{ nextLevel() }}'</button>
          <button type="button" class="btn" (click)="pushItem()">stack.push()</button>
          <button type="button" class="btn" (click)="popItem()">stack.pop()</button>
        </div>
        <ul class="mt-3 list-inside list-disc text-sm" aria-live="polite">
          @for (line of employeeLines(); track $index) {
            <li>{{ line }}</li>
          }
        </ul>
        <p class="mt-2 text-sm" aria-live="polite">
          Stack&lt;string&gt;: <code>{{ stackItems() }}</code>
        </p>
        <sbu-code [code]="code.inheritance" />
        <p note>
          <code>implements</code> verifica soltanto: non eredita codice e non tipizza i parametri dei metodi.
          <code>abstract</code> impedisce <code>new</code> e obbliga le sottoclassi a implementare. Con
          <code>noImplicitOverride</code> ogni metodo sovrascritto richiede <code>override</code>. Getter e setter
          possono avere tipi diversi (TS 5.1). <code>this</code> come tipo di ritorno mantiene il chaining nelle
          sottoclassi.
        </p>
      </sbu-example>

      <sbu-example [n]="19" title="Moduli: import type, export type, isolatedModules" level="intermedio">
        <sbu-code [code]="code.modules" />
        <p note>
          <code>import type</code> viene sempre rimosso: niente import a runtime né dipendenze circolari "vere". Questa
          pagina usa entrambe le forme (<code>import type &#123; Movement &#125;</code> e
          <code>&#123; type Settings &#125;</code>). Con <code>verbatimModuleSyntax</code> (non attivo qui) gli import
          di soli tipi senza <code>type</code> diventano errori.
        </p>
      </sbu-example>

      <sbu-example [n]="20" title="Decoratori: experimentalDecorators vs standard" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="calculate('add')">calculator.add</button>
          <button type="button" class="btn" (click)="calculate('multiply')">calculator.multiply</button>
        </div>
        <ol role="log" class="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          @for (call of calls(); track $index) {
            <li>{{ call }}</li>
          } @empty {
            <li>Nessuna chiamata</li>
          }
        </ol>
        <sbu-code [code]="code.decorators" />
        <p note>
          Angular richiede <code>experimentalDecorators</code>: firma <code>(target, key, descriptor)</code>, decoratori
          di parametro permessi. I decoratori standard (TS 5.0, senza flag) hanno firma <code>(value, context)</code> e
          nessun decoratore di parametro. Il decoratore di metodo gira UNA volta, alla definizione della classe, e
          sostituisce il metodo sul prototype. I decoratori Angular (<code>&#64;Component</code>…) vengono compilati AOT
          in proprietà statiche.
        </p>
      </sbu-example>

      <sbu-example [n]="21" title="using e Symbol.dispose (TS 5.2)" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="usingLog.set(runWithUsing(false))">Blocco completato</button>
          <button type="button" class="btn" (click)="usingLog.set(runWithUsing(true))">Blocco con eccezione</button>
        </div>
        <ol role="log" class="mt-3 list-inside list-decimal rounded-md bg-muted p-3 font-mono text-xs">
          @for (line of usingLog(); track $index) {
            <li>{{ line }}</li>
          } @empty {
            <li>Premi un bottone</li>
          }
        </ol>
        <sbu-code [code]="code.using" />
        <p note>
          <code>using</code> garantisce il dispose all'uscita dal blocco (come <code>try/finally</code>), in ordine inverso
          di dichiarazione. Compila con target ES2022 grazie agli helper di tslib, ma a runtime serve
          <code>Symbol.dispose</code>: nei browser che non lo hanno il log mostra il TypeError.
        </p>
      </sbu-example>

      <sbu-example [n]="22" title="unique symbol e tipi brandizzati (nominali)" level="avanzato">
        <label class="flex max-w-xs flex-col gap-1 text-sm">
          Email
          <input #emailInput class="field" type="email" [value]="emailText()" (input)="emailText.set(emailInput.value)" />
        </label>
        <p class="mt-3 text-sm" aria-live="polite">{{ welcome() }}</p>
        <sbu-code [code]="code.brands" />
        <p note>
          Il brand esiste solo nel tipo: a runtime <code>Email</code> è una stringa normale. L'unico <code>as</code> sta
          nello "smart constructor", dopo la validazione; il resto del codice riceve un valore già garantito. Stessa idea
          per <code>UserId</code> vs <code>OrderId</code> (entrambi number). Un <code>unique symbol</code> richiede
          <code>const</code> o <code>static readonly</code>.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class TypescriptPage {
  protected readonly code = CODE;
  protected readonly formatId = formatId;
  protected readonly runWithUsing = runWithUsing;

  // 1. unknown
  protected readonly unknownSamples = UNKNOWN_SAMPLES;
  protected readonly unknownSample = signal(UNKNOWN_SAMPLES[0]);
  protected readonly valueDescription = computed(() => describeValue(this.unknownSample().value));

  // 2. null, undefined, operatori
  protected readonly falsyishSamples = FALSYISH_SAMPLES;
  protected readonly falsyish = signal(FALSYISH_SAMPLES[0]);
  protected readonly fallbackResult = computed(() => fallbacks(this.falsyish().value));
  protected readonly settingsPresets = SETTINGS_PRESETS;
  protected readonly settingsPreset = signal(SETTINGS_PRESETS[1]);
  protected readonly settingsInput = computed(() => JSON.stringify(this.settingsPreset().value));
  protected readonly settingsOutput = computed(() => JSON.stringify(normalizeSettings(this.settingsPreset().value)));
  protected readonly settingsInitial = computed(() => userInitial(this.settingsPreset().value));

  // 3. satisfies
  protected readonly themeNames = Object.keys(THEMES) as ThemeName[];
  protected readonly themeName = signal<ThemeName>('chiaro');
  protected readonly theme = computed(() => THEMES[this.themeName()]);
  protected readonly themeRadius = computed(() => {
    const radius = this.theme().radius;
    return radius === 'full' ? '9999px' : `${radius}px`;
  });

  // 4. unione e intersezione
  protected readonly formattedId = signal('—');
  protected readonly audited = signal('—');

  // 6. index signature
  protected readonly locale = TRANSLATIONS_IT.locale;
  protected readonly translationKey = signal('save');
  protected readonly translation = computed(() => translate(TRANSLATIONS_IT, this.translationKey()));

  // 7. tuple
  protected readonly rangeText = signal('8-3');
  protected readonly rangeResult = computed(() => {
    const range = parseRange(this.rangeText());
    return range ? `[${range[0]}, ${range[1]}] · lunghezza ${rangeLength(range)}` : 'null (testo non valido)';
  });
  protected readonly joinedTuple = JSON.stringify(concatTuples([1, 'due'], [true]));

  // 8. strutturale
  protected readonly point3d = JSON.stringify(POINT_3D);
  protected readonly distance = distanceFromOrigin(POINT_3D);

  // 9. keyof
  protected readonly userKeys = USER_KEYS;
  protected readonly userKey = signal<UserKey>('name');
  protected readonly property = computed(() => {
    const value = getProperty(DEFAULT_USER, this.userKey());
    return { value: String(value), type: typeof value };
  });

  // 10. enum
  protected readonly priorities = [Priority.Low, Priority.Medium, Priority.High, Priority.Critical];
  protected readonly priority = signal(Priority.High);
  protected readonly priorityName = computed(() => Priority[this.priority()]);
  protected readonly priorityKeys = JSON.stringify(enumKeys(Priority));
  protected readonly statusKeys = JSON.stringify(enumKeys(Status));
  protected readonly roleValues = JSON.stringify(Object.values(ROLE));
  protected readonly up = signal(true);
  protected readonly direction = computed(() => directionArrow(this.up()));

  // 11. funzioni
  protected readonly operationNames = Object.keys(OPERATIONS) as (keyof typeof OPERATIONS)[];
  protected readonly operation = signal<keyof typeof OPERATIONS>('somma');
  protected readonly operationResult = computed(() => OPERATIONS[this.operation()](6, 7));
  protected readonly numbersText = signal('4, 8, 15');
  protected readonly parsed = computed(() => {
    const text = this.numbersText();
    const list = parseInput(text.split(','));
    return {
      single: JSON.stringify(parseInput(text)), // NaN → null in JSON
      list: JSON.stringify(list),
      counter: describeCounter.call({ count: list.length }, 'numeri letti'),
    };
  });
  protected readonly label = buildLabel('Angular', undefined, ' · ', 'TypeScript', 'signals');

  // 12. generici
  protected readonly machine = createMachine(['idle', 'loading', 'success', 'error'], 'idle');
  protected readonly machineStates = JSON.stringify(this.machine.states);
  protected readonly machineState = signal(this.machine.current());

  // 13-14. narrowing
  protected readonly narrowingInputs = NARROWING_INPUTS;
  protected readonly narrowingInput = signal(NARROWING_INPUTS[0]);
  protected readonly narrowed = computed(() => narrowInput(this.narrowingInput().value));
  protected readonly shapes = SHAPES;
  protected readonly selectedShape = signal<Shape>(SHAPES[0]);
  protected readonly shapeJson = computed(() => JSON.stringify(this.selectedShape()));
  protected readonly shapeArea = computed(() => area(this.selectedShape()).toFixed(2));

  // 15-16. predicate, asserzioni
  protected readonly payloads = PAYLOADS;
  protected readonly payloadNames = Object.keys(PAYLOADS) as PayloadName[];
  protected readonly checkedPayload = signal<PayloadName>('valido');
  protected readonly predicateResult = computed(() => checkWithPredicate(PAYLOADS[this.checkedPayload()]));
  protected readonly assertionResult = computed(() => checkWithAssertion(PAYLOADS[this.checkedPayload()]));
  protected readonly trustedPayload = signal<PayloadName>('età stringa');
  protected readonly trustedResult = computed(() => trustWithAs(PAYLOADS[this.trustedPayload()]));

  // 17. classi
  private readonly account = new BankAccount('Ada', 'IT60X0542811101000000123456');
  protected readonly currency = BankAccount.currency;
  protected readonly accountsCreated = BankAccount.created;
  protected readonly accountView = signal(this.viewAccount(''));

  // 18. ereditarietà e generici
  private readonly developer = new Developer('Ada', 60000);
  private readonly employees = [this.developer, new Contractor('Linus', 400)];
  protected readonly employeeLines = signal(this.describeEmployees());
  protected readonly nextLevel = signal(2);
  private readonly stack = new Stack<string>();
  protected readonly stackItems = signal('[]');

  // 20. decoratori
  private readonly calculator = new Calculator();
  protected readonly calls = signal<readonly string[]>([]);

  // 21. using
  protected readonly usingLog = signal<readonly string[]>([]);

  // 22. brand
  protected readonly emailText = signal('Ada@Example.com');
  protected readonly welcome = computed(() => {
    const email = toEmail(this.emailText());
    return email ? welcomeMessage(email) : 'toEmail → null: welcomeMessage non è chiamabile';
  });

  protected saveAudited(): void {
    const product = { id: 1, name: 'Tastiera' };
    const time = new Date().toLocaleTimeString('it-IT');
    this.audited.set(JSON.stringify(withAudit(product, 'ada', time)));
  }

  protected deposit(): void {
    this.account.deposit(50);
    this.accountView.set(this.viewAccount(''));
  }

  protected withdraw(): void {
    try {
      this.account.withdraw(80);
      this.accountView.set(this.viewAccount(''));
    } catch (error) {
      this.accountView.set(this.viewAccount(error instanceof Error ? error.message : String(error)));
    }
  }

  protected promote(): void {
    this.developer.level = String(this.nextLevel()); // il setter accetta string
    this.nextLevel.set(this.developer.level === 3 ? 1 : this.developer.level + 1);
    this.employeeLines.set(this.describeEmployees());
  }

  protected pushItem(): void {
    this.stack.push(`elemento ${this.stack.size + 1}`);
    this.stackItems.set(JSON.stringify(this.stack.toArray()));
  }

  protected popItem(): void {
    this.stack.pop();
    this.stackItems.set(JSON.stringify(this.stack.toArray()));
  }

  protected calculate(operation: 'add' | 'multiply'): void {
    const size = this.calls().length;
    this.calculator[operation](size, 2);
    this.calls.set([...this.calculator.calls]);
  }

  private viewAccount(error: string): AccountView {
    return {
      balance: this.account.currentBalance,
      movements: [...this.account.movements],
      json: runtimeView(this.account),
      error,
    };
  }

  private describeEmployees(): readonly string[] {
    return this.employees.map((employee) => employee.describe());
  }
}
