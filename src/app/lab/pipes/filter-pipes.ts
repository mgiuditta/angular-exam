import { Pipe, PipeTransform } from '@angular/core';

/**
 * ESEMPIO 3 — Pura vs impura (domanda d'esame classica)
 *
 * Contatori di invocazioni: oggetto semplice, NON un signal.
 * Scrivere un signal durante il rendering del template è vietato (NG0600),
 * e mostrare un valore che cambia a ogni render causerebbe NG0100.
 */
export const pipeCalls = { pure: 0, impure: 0 };

const matches = (query: string) => (item: string) =>
  item.toLowerCase().includes(query.toLowerCase());

/**
 * Pura: ricalcola solo se cambia il RIFERIMENTO dell'array o la query.
 * `array.push(x)` NON cambia il riferimento → la lista resta vecchia.
 * Soluzione corretta: aggiornamenti immutabili `list.update(a => [...a, x])`.
 */
@Pipe({ name: 'filterPure' })
export class FilterPurePipe implements PipeTransform {
  transform(items: readonly string[], query: string): readonly string[] {
    pipeCalls.pure++;
    return items.filter(matches(query));
  }
}

/**
 * Impura (`pure: false`):
 * - `transform` gira a OGNI change detection della view che la usa, anche se nulla è cambiato.
 * - un'istanza PER OGNI binding (può quindi avere stato privato, come qui la cache).
 * - vede le mutazioni, ma costa: evitala su liste grandi o view controllate spesso.
 * - deve restituire lo STESSO riferimento se il risultato non cambia, altrimenti in dev mode
 *   il secondo controllo (checkNoChanges) vede un valore diverso → NG0100, e @for rifà il diff.
 *   Stesso motivo per cui `async` e `keyvalue` (impure) tengono una cache interna.
 */
@Pipe({ name: 'filterImpure', pure: false })
export class FilterImpurePipe implements PipeTransform {
  private last: readonly string[] = [];

  transform(items: readonly string[], query: string): readonly string[] {
    pipeCalls.impure++;
    const next = items.filter(matches(query));
    const unchanged = next.length === this.last.length && next.every((v, i) => v === this.last[i]);
    return unchanged ? this.last : (this.last = next);
  }
}
