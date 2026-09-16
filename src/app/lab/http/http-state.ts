import { Injectable, computed, signal } from '@angular/core';

export type LogKind = 'ok' | 'error' | 'info' | 'trace';

export interface LogEntry {
  readonly id: number;
  readonly kind: LogKind;
  readonly text: string;
}

const MAX_ENTRIES = 40;

/**
 * Stato condiviso fra interceptor e pagina: contatore delle richieste in corso + log.
 *
 * `@Injectable()` SENZA `providedIn`: è fornito in `http.routes.ts`, nello STESSO environment injector
 * dell'HttpClient della pagina. Gli interceptor funzionali girano nell'injection context di quell'injector,
 * quindi `inject(HttpActivity)` negli interceptor e nella pagina restituisce la stessa istanza.
 */
@Injectable()
export class HttpActivity {
  private nextId = 0;
  private readonly pendingCount = signal(0);
  private readonly entries = signal<readonly LogEntry[]>([]);

  readonly pending = this.pendingCount.asReadonly();
  readonly loading = computed(() => this.pending() > 0);
  readonly log = this.entries.asReadonly();

  started(): void {
    this.pendingCount.update((n) => n + 1);
  }

  finished(): void {
    this.pendingCount.update((n) => n - 1);
  }

  write(text: string, kind: LogKind = 'info'): void {
    const entry = { id: this.nextId++, kind, text };
    this.entries.update((entries) => [...entries, entry].slice(-MAX_ENTRIES));
  }

  clear(kind: LogKind | 'all' = 'all'): void {
    this.entries.update((entries) => (kind === 'all' ? [] : entries.filter((entry) => entry.kind !== kind)));
  }
}

export const DEMO_TOKEN = 'demo-token';

/** Sessione finta: l'auth interceptor legge il token da qui. */
@Injectable()
export class Session {
  private readonly currentToken = signal<string | null>(DEMO_TOKEN);
  readonly token = this.currentToken.asReadonly();

  login(): void {
    this.currentToken.set(DEMO_TOKEN);
  }

  logout(): void {
    this.currentToken.set(null);
  }
}
