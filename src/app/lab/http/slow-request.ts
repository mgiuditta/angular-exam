import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente che parte con una richiesta lenta. `takeUntilDestroyed()` (nel constructor = injection
 * context) fa unsubscribe alla distruzione → HttpClient annulla la richiesta (fetch: AbortController,
 * XHR: xhr.abort()). Il logging interceptor lo registra come "annullata".
 */
@Component({
  selector: 'sbu-slow-request',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p role="status" class="text-sm">{{ status() }}</p>`,
})
export class SlowRequest {
  protected readonly status = signal('Richiesta lenta in corso…');

  constructor() {
    inject(HttpClient)
      .get<{ message: string }>('/api/slow')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (body) => this.status.set(body.message),
        error: (error: unknown) => this.status.set(error instanceof Error ? error.message : 'Errore'),
      });
  }
}
