import { ChangeDetectionStrategy, Component, DestroyRef, NgZone, inject, signal } from '@angular/core';

const RUN_OUTSIDE_DELAY_MS = 300;

/**
 * Legge a runtime come è configurata l'app.
 * - Senza zone.js `globalThis.Zone` non esiste e NgZone è un NoopNgZone:
 *   `run()` e `runOutsideAngular()` eseguono la funzione e basta.
 * - Con zone.js `runOutsideAngular` serviva a NON far partire il CD per timer/scroll/mousemove frequenti;
 *   in zoneless è superfluo: il CD parte solo con notifiche esplicite (signal, markForCheck, …).
 */
@Component({
  selector: 'sbu-zone-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt><code>globalThis.Zone</code> presente</dt>
      <dd>{{ zoneLoaded ? 'sì (zone.js)' : 'no (zoneless)' }}</dd>
      <dt><code>NgZone.isInAngularZone()</code></dt>
      <dd>{{ inAngularZone }}</dd>
      <dt>signal scritto in <code>runOutsideAngular</code></dt>
      <dd class="tabular-nums">{{ outsideCount() }}</dd>
    </dl>
    <button type="button" class="btn mt-2" (click)="incrementOutsideAngular()">
      runOutsideAngular → setTimeout → signal
    </button>
  `,
})
export class ZoneInfo {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly zoneLoaded = 'Zone' in globalThis;
  protected readonly inAngularZone = NgZone.isInAngularZone();
  protected readonly outsideCount = signal(0);

  protected incrementOutsideAngular(): void {
    this.ngZone.runOutsideAngular(() => {
      const id = setTimeout(() => {
        unregister();
        // Anche "fuori da Angular" il signal notifica lo scheduler zoneless: la view si aggiorna.
        this.outsideCount.update((n) => n + 1);
      }, RUN_OUTSIDE_DELAY_MS);
      const unregister = this.destroyRef.onDestroy(() => clearTimeout(id));
    });
  }
}
