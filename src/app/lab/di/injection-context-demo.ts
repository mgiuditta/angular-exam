import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  assertInInjectionContext,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { DiLog } from './di-log';

/**
 * Funzione `injectXxx()` riusabile. `assertInInjectionContext` lancia NG0203 con il NOME
 * della funzione nel messaggio: errore più chiaro di quello generico di `inject()`.
 */
export function injectDiLog(): DiLog {
  assertInInjectionContext(injectDiLog);
  return inject(DiLog);
}

interface Attempt {
  readonly ok: boolean;
  readonly text: string;
}

/**
 * ESEMPIO 2 — Dove funziona inject()
 *
 * Injection context = mentre il DI sta CREANDO qualcosa: field initializer, constructor,
 * useFactory, factory di InjectionToken, guard/resolver/interceptor funzionali,
 * provideAppInitializer, runInInjectionContext. Tutto il resto (event handler, setTimeout,
 * dopo un `await`, ngOnInit) è FUORI → NG0203.
 */
@Component({
  selector: 'sbu-di-injection-context-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="callInHandler()">injectDiLog() nel click</button>
      <button type="button" class="btn" (click)="callAfterAwait()">injectDiLog() dopo await</button>
      <button type="button" class="btn" (click)="callInContext()">runInInjectionContext(injector, …)</button>
    </div>
    <p role="status" class="mt-3 text-sm">
      @if (attempt(); as a) {
        <strong>{{ a.ok ? 'OK' : 'Errore' }}:</strong>
        <code class="break-all">{{ a.text }}</code>
      } @else {
        Premi un bottone.
      }
    </p>
  `,
})
export class InjectionContextDemo {
  // field initializer: injection context ✔
  private readonly injector = inject(Injector);
  private readonly log: DiLog;

  protected readonly attempt = signal<Attempt | null>(null);

  constructor() {
    // constructor: injection context ✔ (anche dentro funzioni chiamate in modo sincrono da qui)
    this.log = injectDiLog();
  }

  protected callInHandler(): void {
    this.attempt.set(this.tryInject());
  }

  protected async callAfterAwait(): Promise<void> {
    await Promise.resolve();
    this.attempt.set(this.tryInject()); // il contesto non sopravvive a un await
  }

  protected callInContext(): void {
    const log = runInInjectionContext(this.injector, () => injectDiLog());
    log.add('injectDiLog() dentro runInInjectionContext');
    this.attempt.set({ ok: true, text: `stessa istanza del constructor: ${log === this.log}` });
  }

  private tryInject(): Attempt {
    try {
      injectDiLog();
      return { ok: true, text: 'nessun errore' };
    } catch (error) {
      return { ok: false, text: error instanceof Error ? error.message : String(error) };
    }
  }
}
