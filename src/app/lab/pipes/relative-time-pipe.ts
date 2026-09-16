import {
  ChangeDetectorRef,
  DestroyRef,
  LOCALE_ID,
  Pipe,
  PipeTransform,
  inject,
} from '@angular/core';

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
];

/**
 * ESEMPIO 4 — Pipe con DI e lifecycle proprio
 *
 *   {{ createdAt | relativeTime }}  → "10 seconds ago", aggiornato ogni secondo
 *
 * Concetti:
 * - le pipe supportano `inject()`: LOCALE_ID, ChangeDetectorRef (quello della view che usa la pipe),
 *   DestroyRef (distrutto insieme a quella view). Supportano anche `ngOnDestroy`.
 * - pipe IMPURA: l'input (una data) non cambia, ma il risultato sì con il passare del tempo.
 * - zoneless: un setInterval da solo NON fa ripartire il change detection →
 *   serve `markForCheck()` (è ciò che fa internamente anche la pipe `async`).
 * - `now` si aggiorna solo nel timer, non dentro transform: il checkNoChanges di dev mode
 *   rilegge lo stesso valore → niente NG0100.
 * - le pipe NON sono provider: per usarle in TypeScript vanno aggiunte a `providers`
 *   (meglio estrarre la logica in una funzione pura).
 */
@Pipe({ name: 'relativeTime', pure: false })
export class RelativeTimePipe implements PipeTransform {
  private readonly format = new Intl.RelativeTimeFormat(inject(LOCALE_ID), { numeric: 'auto' });
  private now = Date.now();

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    const id = setInterval(() => {
      this.now = Date.now();
      cdr.markForCheck();
    }, 1000);
    // Senza questo, il timer sopravvive alla view: memory leak + markForCheck su view morta.
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  transform(value: Date | number): string {
    const seconds = Math.round((+value - this.now) / 1000);
    const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? UNITS[UNITS.length - 1];
    return this.format.format(Math.round(seconds / size), unit);
  }
}
