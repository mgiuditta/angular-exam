import type { Equal, Expect } from '../shared/type-test';
import { fail } from './basics';

/*
 * NARROWING: il compilatore segue il flusso del codice (control-flow analysis) e restringe i tipi.
 * typeof, truthiness, uguaglianza, in, instanceof, discriminated union, type predicate, assertion function,
 * exhaustiveness con never. In fondo: type assertion `as`, doppia asserzione, `!` e `!:`.
 */

// ── Discriminated union + exhaustiveness ─────────────────────────────────────

/** Ogni membro ha una proprietà letterale comune (il discriminante `kind`). */
export type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'square'; readonly side: number }
  | { readonly kind: 'rectangle'; readonly width: number; readonly height: number };

export type ShapeKind = Shape['kind'];

export const SHAPES: readonly Shape[] = [
  { kind: 'circle', radius: 1 },
  { kind: 'square', side: 2 },
  { kind: 'rectangle', width: 2, height: 3 },
];

/** Se aggiungi un membro a Shape e dimentichi il case, `shape` non è più never → errore di compilazione. */
export function assertNever(value: never): never {
  return fail(`Caso non gestito: ${JSON.stringify(value)}`);
}

export function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2; // qui shape è solo il cerchio
    case 'square':
      return shape.side ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      return assertNever(shape); // shape: never
  }
}

// ── typeof, truthiness, uguaglianza, in, instanceof ──────────────────────────

export type Input = string | number | readonly string[] | Date | { readonly label: string } | null | undefined;

export function narrowInput(input: Input): string {
  if (input == null) return 'null o undefined (== null copre entrambi)'; // uguaglianza
  if (typeof input === 'string') return input ? `stringa "${input}"` : 'stringa vuota (falsy!)'; // typeof + truthiness
  if (typeof input === 'number') return `numero ${input}`;
  if (input instanceof Date) return `Date ${input.toISOString().slice(0, 10)}`; // instanceof: classi
  if ('label' in input) return `oggetto con label "${input.label}"`; // in: proprietà
  type _ = Expect<Equal<typeof input, readonly string[]>>; // ciò che resta dopo tutti i controlli
  return `array: ${input.join(', ')}`;
}

// ── Type predicate e assertion function ──────────────────────────────────────

export interface User {
  readonly name: string;
  readonly age: number;
}

/** Type predicate: il boolean restituito "insegna" al compilatore il tipo. La verifica è responsabilità TUA. */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' && // da TS 4.9 `in` aggiunge la proprietà al tipo
    'age' in value &&
    typeof value.age === 'number'
  );
}

/** Assertion function: se ritorna, da lì in poi value è User; altrimenti lancia. */
export function assertIsUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new TypeError('Non è un User valido');
}

/** Payload di esempio per le demo (JSON "esterno", quindi unknown). */
export const PAYLOADS = {
  valido: '{"name":"Ada","age":36}',
  'età stringa': '{"name":"Ada","age":"36"}',
  'senza nome': '{"age":36}',
  null: 'null',
} as const satisfies Record<string, string>;

export type PayloadName = keyof typeof PAYLOADS;

export function checkWithPredicate(json: string): string {
  const data: unknown = JSON.parse(json);
  return isUser(data) ? `User: ${data.name}, ${data.age} anni` : 'non è un User';
}

export function checkWithAssertion(json: string): string {
  const data: unknown = JSON.parse(json);
  try {
    assertIsUser(data);
    return `User: ${data.name.toUpperCase()}`; // narrowing dopo l'asserzione
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error); // catch: unknown
  }
}

// ── Type assertion: `as`, doppia asserzione, `!` ─────────────────────────────

/** `as` NON converte e NON verifica: se il JSON mente, l'errore arriva a runtime, lontano dalla causa. */
export function trustWithAs(json: string): string {
  try {
    const user = JSON.parse(json) as User; // JSON.parse restituisce any: qui "promettiamo" che è un User
    return `età tra 10 anni: ${user.age + 10}, nome: ${user.name.toUpperCase()}`;
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}

function narrowingChecks(shape: Shape, maybe: string | undefined, values: (number | undefined)[]): void {
  // @ts-expect-error senza narrowing la proprietà esiste solo su un membro dell'unione
  shape.radius;

  // Inferred type predicate (TS 5.5): filter con un controllo semplice restringe il tipo dell'array.
  const defined = values.filter((value) => value !== undefined);

  // Condizione salvata in una costante: il narrowing funziona lo stesso (TS 4.4, aliased conditions).
  const isCircle = shape.kind === 'circle';
  if (isCircle) shape.radius;

  // Destructuring di una discriminated union: il narrowing funziona anche sulle variabili separate.
  const { kind } = shape;

  // Assertion function come arrow: serve un'annotazione di tipo ESPLICITA sulla variabile.
  const assertArrow = (value: unknown): asserts value is User => assertIsUser(value);
  // @ts-expect-error "Assertions require every name in the call target to be declared with an explicit type annotation"
  assertArrow(null);
  const annotated: (value: unknown) => asserts value is User = assertArrow;
  annotated({ name: 'Ada', age: 36 });

  // @ts-expect-error `as` rifiuta conversioni tra tipi che non si sovrappongono…
  const direct = 'testo' as number;
  const forced = 'testo' as unknown as number; // …la doppia asserzione passa tutto: quasi sempre un bug

  // Non-null assertion `!`: toglie null/undefined dal tipo, nessun controllo a runtime.
  const length = maybe!.length;

  type _ = [
    Expect<Equal<typeof defined, number[]>>,
    Expect<Equal<typeof forced, number>>,
    Expect<Equal<typeof length, number>>,
    Expect<Equal<ShapeKind, 'circle' | 'square' | 'rectangle'>>,
    Expect<Equal<typeof kind, ShapeKind>>,
  ];
}

function controlFlow(input: string | number, callback: (fn: () => void) => void): void {
  // Definite assignment `!:` su una variabile: "fidati, verrà assegnata" (tipico con callback).
  let initializedLater!: number;
  callback(() => (initializedLater = 1));
  initializedLater.toFixed();

  let value = input; // string | number
  if (typeof value === 'string') {
    // Da TS 5.4 il narrowing resta valido nelle closure create DOPO l'ultima assegnazione.
    callback(() => value.toUpperCase());
  }

  let reassigned = input;
  if (typeof reassigned === 'string') {
    // @ts-expect-error qui la variabile viene riassegnata dopo la closure: il narrowing si perde
    callback(() => reassigned.toUpperCase());
    reassigned = 42;
  }
}
