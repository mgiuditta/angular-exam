import { AsyncPipe } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, timer } from 'rxjs';
import { RenderCounter } from './render-counter';

export const ASYNC_DELAY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cosa fa partire (o NON fa partire) il change detection in un'app ZONELESS.
 *
 * Senza zone.js nessuno "intercetta" setTimeout/Promise/XHR: Angular aggiorna la view solo se qualcuno
 * lo notifica. Notifiche valide:
 * - signal letto nel template che cambia            → marca la view (RefreshView) e pianifica un CD
 * - listener del template o `host` ((click) ecc.)   → markViewDirty della view e degli antenati
 * - `ChangeDetectorRef.markForCheck()`              → idem, a mano (lo fa anche la pipe `async`)
 * - input cambiato dal template del padre o con `ComponentRef.setInput()`
 * - view attaccata/staccata (`@if`, `createComponent`, `appRef.attachView`)
 * Mutare un campo semplice in un callback asincrono NON è una notifica.
 *
 * Il CD pianificato gira in un macrotask (setTimeout/rAF): un microtask (Promise GIÀ risolta) partito
 * dal click finisce prima e "sembra" funzionare. Per questo le demo aspettano 500ms.
 */
@Component({
  selector: 'sbu-zoneless-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RenderCounter],
  host: { class: 'block' },
  template: `
    <dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-sm">
      <dt>campo semplice <code>plain</code></dt>
      <dd data-testid="plain" class="tabular-nums">{{ plain }}</dd>
      <dt>signal <code>counter()</code></dt>
      <dd data-testid="signal" class="tabular-nums">{{ counter() }}</dd>
      <dt>Subject + pipe <code>async</code></dt>
      <dd class="tabular-nums">{{ subject | async }}</dd>
      <dt>refresh di questa view</dt>
      <dd><span sbuRenderCounter></span></dd>
    </dl>

    <h3 class="mt-3 text-sm font-medium">Non aggiornano la view (dopo {{ delay }}ms)</h3>
    <div class="mt-1 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="plainViaTimeout()">setTimeout → plain++</button>
      <button type="button" class="btn" (click)="plainViaAwait()">await Promise → plain++</button>
      <button type="button" class="btn" (click)="plainViaSubscribe()">subscribe → plain++</button>
      <button type="button" class="btn" (click)="plainViaTick()">setTimeout → plain++ e appRef.tick()</button>
    </div>

    <h3 class="mt-3 text-sm font-medium">Aggiornano la view</h3>
    <div class="mt-1 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="plainWithMarkForCheck()">setTimeout → plain++ e markForCheck()</button>
      <button type="button" class="btn" (click)="signalViaTimeout()">setTimeout → counter.update()</button>
      <button type="button" class="btn" (click)="subjectViaTimeout()">setTimeout → subject.next()</button>
      <button type="button" class="btn" (click)="onlyListener()">Click a vuoto (solo listener)</button>
    </div>
  `,
})
export class ZonelessDemo {
  protected readonly delay = ASYNC_DELAY_MS;

  // Campo NON reattivo, di proposito: è l'errore tipico migrando da zone.js a zoneless.
  protected plain = 0;
  protected readonly counter = signal(0);
  protected readonly subject = new BehaviorSubject(0);

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);

  protected plainViaTimeout(): void {
    this.later(() => this.plain++);
  }

  protected async plainViaAwait(): Promise<void> {
    await wait(ASYNC_DELAY_MS);
    this.plain++;
  }

  protected plainViaSubscribe(): void {
    timer(ASYNC_DELAY_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.plain++);
  }

  protected plainViaTick(): void {
    this.later(() => {
      this.plain++;
      // tick() parte dalla root ma SALTA le view OnPush non marcate: questa non si aggiorna.
      this.appRef.tick();
    });
  }

  protected plainWithMarkForCheck(): void {
    this.later(() => {
      this.plain++;
      this.cdr.markForCheck();
    });
  }

  protected signalViaTimeout(): void {
    this.later(() => this.counter.update((n) => n + 1));
  }

  protected subjectViaTimeout(): void {
    this.later(() => this.subject.next(this.subject.value + 1));
  }

  /** Non cambia nulla: il listener stesso marca la view dirty, e il refresh mostra il valore "nascosto" di plain. */
  protected onlyListener(): void {}

  /** setTimeout annullato alla distruzione (niente callback su una view morta). */
  private later(callback: () => void): void {
    const id = setTimeout(() => {
      unregister();
      callback();
    }, ASYNC_DELAY_MS);
    const unregister = this.destroyRef.onDestroy(() => clearTimeout(id));
  }
}
