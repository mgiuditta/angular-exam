import type { Equal, Expect } from '../shared/type-test';

/*
 * TUPLE: array a lunghezza e tipi per posizione. Etichette, opzionali, rest, variadic, readonly.
 */

/** Tupla con etichette (solo documentazione: non cambiano l'accesso, che resta per indice). */
export type Range = readonly [start: number, end: number];

/** Opzionale in coda: la lunghezza diventa 2 | 3. */
export type Rgb = [red: number, green: number, blue: number, alpha?: number];

/** Rest in mezzo o in coda: lunghezza variabile, tipi per posizione. */
export type Row = [id: number, ...cells: string[]];

/** "1-5" → [1, 5]. Restituisce una tupla readonly o null se il testo non è valido. */
export function parseRange(text: string): Range | null {
  const match = /^\s*(-?\d+)\s*-\s*(-?\d+)\s*$/.exec(text);
  if (!match) return null;
  const range: Range = [Number(match[1]), Number(match[2])];
  return range[0] <= range[1] ? range : [range[1], range[0]];
}

/** Destructuring di una tupla: i nomi sono liberi, i tipi arrivano dalle posizioni. */
export function rangeLength([start, end]: Range): number {
  return end - start + 1;
}

/** Variadic tuple types: i tipi degli argomenti si concatenano mantenendo lunghezza e posizioni. */
export function concatTuples<A extends readonly unknown[], B extends readonly unknown[]>(
  a: readonly [...A],
  b: readonly [...B],
): [...A, ...B] {
  return [...a, ...b];
}

function tupleChecks(range: Range, rgb: Rgb): void {
  const joined = concatTuples([1, 'due'], [true]);
  const inferredArray = [1, 5]; // senza annotazione un array letterale è number[], non una tupla

  type _ = [
    Expect<Equal<typeof joined, [number, string, boolean]>>,
    Expect<Equal<typeof inferredArray, number[]>>,
    Expect<Equal<Rgb['length'], 3 | 4>>,
    Expect<Equal<Row[0], number>>,
    Expect<Equal<Row[number], number | string>>,
    Expect<Equal<Range['length'], 2>>,
    Expect<Equal<typeof rgb[3], number | undefined>>,
  ];

  // @ts-expect-error una tupla readonly non si modifica
  range[0] = 3;
  // @ts-expect-error indice fuori dalla tupla
  range[2];
  // @ts-expect-error troppi elementi per [number, number]
  const tooLong: Range = [1, 2, 3];
  // @ts-expect-error l'elemento 0 di Row deve essere number
  const badRow: Row = ['a', 'b'];
  const okRow: Row = [1, 'a', 'b', 'c'];
}
