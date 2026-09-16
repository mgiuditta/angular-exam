/// <reference lib="esnext.disposable" />
// ↑ tipi di `Disposable` e `Symbol.dispose`: con target ES2022 non sono nella lib di default.
import type { Equal, Expect } from '../shared/type-test';

/*
 * CLASSI: public/protected/private (solo TS) vs #private (JavaScript), parameter properties, readonly,
 * static, getter/setter, abstract, implements, override (noImplicitOverride attivo), classi generiche.
 * In fondo: decoratori "experimental" (quelli di Angular) e `using` + Symbol.dispose.
 */

// ── Modificatori di accesso ──────────────────────────────────────────────────

export interface Movement {
  readonly amount: number;
  readonly balance: number;
}

export class BankAccount {
  static #created = 0; // static + #private: contatore condiviso da tutte le istanze
  static readonly currency = 'EUR';

  readonly #movements: Movement[] = []; // #private: VERO privato a runtime (JS), invisibile anche a JSON/Object.keys
  private balance = 0; // private TS: solo compile time, a runtime è una proprietà normale
  protected readonly createdAt: number; // visibile alle sottoclassi

  /** Parameter properties: `readonly owner` dichiara E assegna il campo (genera codice JS!). */
  constructor(
    readonly owner: string,
    public iban: string,
  ) {
    this.createdAt = ++BankAccount.#created;
  }

  static get created(): number {
    return BankAccount.#created;
  }

  /** Getter senza setter → proprietà in sola lettura per i chiamanti. */
  get movements(): readonly Movement[] {
    return this.#movements;
  }

  get currentBalance(): number {
    return this.balance;
  }

  deposit(amount: number): void {
    this.move(amount);
  }

  withdraw(amount: number): void {
    if (amount > this.balance) throw new RangeError(`Saldo insufficiente (${this.balance} ${BankAccount.currency})`);
    this.move(-amount);
  }

  protected move(amount: number): void {
    this.balance += amount;
    this.#movements.push({ amount, balance: this.balance });
  }
}

/** Cosa vede il mondo JavaScript di un'istanza: `private` sì, `#private` no. */
export function runtimeView(account: BankAccount): string {
  return JSON.stringify(account);
}

// ── abstract, implements, override, getter/setter ────────────────────────────

export interface Describable {
  describe(): string;
}

export abstract class Employee implements Describable {
  constructor(readonly name: string) {}

  abstract monthlyCost(): number; // nessuna implementazione: obbligatoria nelle sottoclassi

  describe(): string {
    return `${this.name}: ${this.monthlyCost().toFixed(0)} €/mese`;
  }
}

export class Developer extends Employee {
  #level = 1;

  constructor(
    name: string,
    private readonly salary: number,
  ) {
    super(name); // obbligatorio PRIMA di usare this
  }

  /** Setter con validazione; getter e setter possono avere tipi diversi (TS 5.1) purché compatibili in lettura. */
  get level(): number {
    return this.#level;
  }
  set level(value: number | string) {
    this.#level = Math.min(3, Math.max(1, Number(value)));
  }

  override monthlyCost(): number {
    return (this.salary / 12) * (1 + (this.level - 1) * 0.2);
  }

  override describe(): string {
    return `${super.describe()} (livello ${this.level})`;
  }
}

export class Contractor extends Employee {
  constructor(
    name: string,
    private readonly dailyRate: number,
  ) {
    super(name);
  }

  override monthlyCost(): number {
    return this.dailyRate * 20;
  }
}

// ── Classe generica ──────────────────────────────────────────────────────────

export class Stack<T> {
  readonly #items: T[] = [];

  get size(): number {
    return this.#items.length;
  }

  push(item: T): this {
    this.#items.push(item); // `this` come tipo di ritorno: chaining che funziona anche nelle sottoclassi
    return this;
  }

  pop(): T | undefined {
    return this.#items.pop();
  }

  peek(): T | undefined {
    return this.#items.at(-1);
  }

  toArray(): readonly T[] {
    return [...this.#items];
  }
}

function classChecks(account: BankAccount, developer: Developer): void {
  // @ts-expect-error private: accesso vietato fuori dalla classe…
  account.balance;
  account['balance']; // …ma con le parentesi quadre TS lo permette (escape hatch): private non protegge a runtime
  // @ts-expect-error #private: nessuna scappatoia (e `account.#movements` fuori dalla classe è un errore di SINTASSI)
  account['#movements'];
  // @ts-expect-error protected: solo dentro la classe e le sottoclassi
  account.createdAt;
  // @ts-expect-error readonly (parameter property): assegnabile solo nel costruttore
  account.owner = 'altro';
  // @ts-expect-error getter senza setter → sola lettura
  account.movements = [];

  // @ts-expect-error non si istanzia una classe abstract
  new Employee('Ada');

  developer.level = '2'; // il setter accetta string

  class Intern extends Employee {
    // @ts-expect-error noImplicitOverride: sovrascrivere un metodo richiede la keyword `override`
    describe(): string { return 'stagista'; }
    monthlyCost(): number { return 0; } // implementare un abstract NON richiede override
  }

  // @ts-expect-error implements verifica la forma ma NON tipizza i parametri: qui manca describe()
  class NotDescribable implements Describable {}

  // Ordine di inizializzazione (useDefineForClassFields, default con target ES2022):
  // i field initializer girano PRIMA del corpo del costruttore che assegna le parameter properties.
  class Wrong {
    constructor(private readonly base: number) {}
    // @ts-expect-error "Property 'base' is used before its initialization"
    doubled = this.base * 2;
  }

  class Form {
    // @ts-expect-error strictPropertyInitialization: campo non inizializzato né nel costruttore
    name: string;
    email!: string; // definite assignment `!:` → "verrà assegnato altrove" (es. ngOnInit, form esterno)
    notes?: string; // oppure rendilo opzionale
  }

  const numbers = new Stack<number>().push(1).push(2);
  // @ts-expect-error Stack<number> accetta solo number
  numbers.push('3');

  type _ = [
    Expect<Equal<ReturnType<typeof numbers.pop>, number | undefined>>,
    Expect<Equal<typeof BankAccount.currency, 'EUR'>>, // static readonly → letterale
    Expect<Equal<InstanceType<typeof Developer>, Developer>>,
  ];
}

// ── Decoratori: experimentalDecorators (Angular) ─────────────────────────────

/**
 * Firma "legacy" (experimentalDecorators: true, come richiede Angular): (target, key, descriptor).
 * `target` è il PROTOTYPE della classe: tipizzarlo vincola le classi su cui si può usare il decoratore.
 * I decoratori standard TC39 (TS 5.0, senza il flag) hanno firma (value, context) e NON supportano
 * i decoratori di PARAMETRO (`@Inject()`, `@Optional()`): per questo Angular resta sugli experimental.
 * `emitDecoratorMetadata` non serve: Angular genera da sé i metadati per la DI.
 */
export function logCalls(_target: { readonly calls: string[] }, key: string, descriptor: PropertyDescriptor): void {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  descriptor.value = function (this: { readonly calls: string[] }, ...args: unknown[]): unknown {
    const result = original.apply(this, args);
    this.calls.push(`${key}(${args.join(', ')}) → ${String(result)}`);
    return result;
  };
}

export class Calculator {
  readonly calls: string[] = [];

  @logCalls
  add(a: number, b: number): number {
    return a + b;
  }

  @logCalls
  multiply(a: number, b: number): number {
    return a * b;
  }
}

function decoratorChecks(): void {
  class WithoutCalls {
    // @ts-expect-error il target deve avere `calls`: il decoratore è tipizzato sul prototype
    @logCalls
    run(): void {}
  }
}

// ── using + Symbol.dispose (TS 5.2) ──────────────────────────────────────────

/**
 * `using` chiama `[Symbol.dispose]()` all'uscita dal blocco, anche se viene lanciata un'eccezione
 * (come try/finally). TS lo trasforma per target ES2022 con helper tslib, ma serve `Symbol.dispose`
 * nel runtime (Node recenti, Chrome/Edge ≥ 134, Firefox ≥ 135): altrimenti lancia TypeError.
 */
export class Connection implements Disposable {
  constructor(
    private readonly name: string,
    private readonly log: string[],
  ) {
    log.push(`apro ${name}`);
  }

  query(sql: string): void {
    this.log.push(`${this.name}: ${sql}`);
  }

  [Symbol.dispose](): void {
    this.log.push(`chiudo ${this.name}`);
  }
}

export function runWithUsing(shouldThrow: boolean): readonly string[] {
  const log: string[] = [];
  try {
    using connection = new Connection('db', log);
    connection.query('SELECT 1');
    if (shouldThrow) throw new Error('query fallita');
    log.push('fine blocco');
  } catch (error) {
    log.push(error instanceof Error ? `catch: ${error.message}` : 'catch');
  }
  return log;
}
