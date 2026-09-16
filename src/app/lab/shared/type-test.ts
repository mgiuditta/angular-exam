/**
 * Mini libreria di test sui TIPI: verificati dal compilatore, zero codice a runtime.
 *
 *   type _ = Expect<Equal<ReturnType<typeof f>, number>>;   // se non è vero, la build fallisce
 *
 * `Equal` confronta due tipi in modo esatto (distingue any, readonly, opzionali):
 * due funzioni generiche sono assegnabili tra loro solo se X e Y sono IDENTICI.
 */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type Expect<T extends true> = T;
