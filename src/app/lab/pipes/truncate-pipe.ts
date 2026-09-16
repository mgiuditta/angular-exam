import { Pipe, PipeTransform } from '@angular/core';

/**
 * ESEMPIO 2 — Pipe pura con argomenti
 *
 *   {{ text | truncate }}            → max 20, suffisso '…'
 *   {{ text | truncate: 10 : '...' }} → argomenti separati da ':'
 *
 * Pipe PURA (default, `pure: true`):
 * - Angular richiama `transform` SOLO se cambia (===) il valore in input o un argomento.
 * - risultato memoizzato per binding → costo zero nei CD successivi.
 * - UNA istanza condivisa per tutti gli usi nella stessa view.
 * - deve essere una funzione pura: stesso input → stesso output, niente side effect.
 */
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, max = 20, suffix = '…'): string {
    if (!value) return '';
    return value.length > max ? value.slice(0, max).trimEnd() + suffix : value;
  }
}
