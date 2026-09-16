import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { RenderCounter } from './render-counter';

const TICK_MS = 1000;

/**
 * Ticker controllato dall'esterno (i bottoni sono nel padre, vedi sotto) per provare ChangeDetectorRef.
 *
 * - detach():        la view esce dall'albero del CD. NIENTE la aggiorna: né eventi, né markForCheck,
 *                    né i signal letti nel template (restano "dirty" in attesa).
 * - detectChanges(): aggiorna SUBITO e in modo sincrono questa view e i figli, anche se staccata.
 * - reattach():      rientra nel CD; se aveva aggiornamenti in sospeso li mostra al prossimo giro.
 * - markForCheck():  marca questa view e gli ANTENATI (non i figli) e pianifica un CD. Su una view
 *                    staccata non ha effetto visibile.
 *
 * Perché i bottoni stanno fuori: un bottone DENTRO una view staccata non potrebbe aggiornare
 * nemmeno la propria etichetta.
 */
@Component({
  selector: 'sbu-detached-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RenderCounter],
  host: { class: 'block' },
  template: `
    <p class="rounded-md border border-border p-3 text-sm">
      Tick: <strong class="tabular-nums" data-testid="ticks">{{ ticks() }}</strong> ·
      <span sbuRenderCounter></span>
    </p>
  `,
})
export class DetachedTicker {
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly _running = signal(false);
  private readonly _attached = signal(true);
  readonly running = this._running.asReadonly();
  readonly attached = this._attached.asReadonly();

  protected readonly ticks = signal(0);
  private intervalId: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.intervalId));
  }

  toggle(): void {
    if (this._running()) {
      clearInterval(this.intervalId);
    } else {
      this.intervalId = setInterval(() => this.ticks.update((n) => n + 1), TICK_MS);
    }
    this._running.update((running) => !running);
  }

  detach(): void {
    this.cdr.detach();
    this._attached.set(false);
  }

  reattach(): void {
    this.cdr.reattach();
    this._attached.set(true);
  }

  detectChanges(): void {
    this.cdr.detectChanges();
  }
}
