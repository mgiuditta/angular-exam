import { Injectable, signal } from '@angular/core';

/**
 * Log a schermo degli hook.
 *
 * Due canali diversi, di proposito:
 * - `entries` (signal): hook che girano UNA volta o su azione utente (init, changes, destroy).
 *   Scriverlo durante il CD è permesso (gli hook girano fuori dal contesto reattivo del template):
 *   la view che lo mostra viene marcata dirty e Angular fa un altro giro di CD.
 * - `checks` (oggetto semplice): hook che girano a OGNI CD (ngDoCheck, *Checked, afterEveryRender).
 *   Se scrivessero un signal mostrato a video: CD → hook → signal → CD → hook… → loop infinito (NG0103).
 */
@Injectable({ providedIn: 'root' })
export class LifecycleLog {
  private readonly _entries = signal<readonly string[]>([]);
  readonly entries = this._entries.asReadonly();

  readonly checks: Record<string, number> = {};

  add(source: string, message: string): void {
    this._entries.update((list) => [...list, `[${source}] ${message}`]);
  }

  count(key: string): void {
    this.checks[key] = (this.checks[key] ?? 0) + 1;
  }

  clear(): void {
    this._entries.set([]);
    for (const key of Object.keys(this.checks)) delete this.checks[key];
  }
}
