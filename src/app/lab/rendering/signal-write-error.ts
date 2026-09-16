import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/**
 * NG0600: scrivere un signal mentre Angular sta leggendo in un contesto reattivo "puro".
 * Vietato in: computed(), espressioni del template, (input transform).
 * Permesso in: event handler, effect(), afterRenderEffect, callback asincroni, lifecycle hook.
 *
 * La demo crea un computed "sbagliato" e lo legge dentro try/catch: l'errore viene mostrato,
 * non arriva all'ErrorHandler e la pagina non si rompe.
 */
@Component({
  selector: 'sbu-signal-write-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <button type="button" class="btn" (click)="tryWriteInComputed()">Leggi un computed che scrive un signal</button>
    <p class="mt-2 text-sm" role="status">
      @if (error(); as message) {
        <span class="text-destructive">Errore catturato: {{ message }}</span>
      } @else {
        Nessun errore finora. Contatore scritto: {{ counter() }}
      }
    </p>
  `,
})
export class SignalWriteError {
  protected readonly counter = signal(0);
  protected readonly error = signal<string | null>(null);

  protected tryWriteInComputed(): void {
    const badDouble = computed(() => {
      this.counter.update((n) => n + 1); // side effect in un computed → NG0600
      return this.counter() * 2;
    });
    try {
      badDouble();
      this.error.set(null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }
}
