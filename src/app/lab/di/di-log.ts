import { Injectable, signal } from '@angular/core';

/**
 * Log a schermo di creazioni/distruzioni delle istanze.
 * `providedIn: 'root'` → singleton tree-shakable: esiste solo se qualcuno lo inietta,
 * è condiviso da tutta l'app e vive quanto l'app (anche fuori dagli element injector).
 */
@Injectable({ providedIn: 'root' })
export class DiLog {
  private readonly _entries = signal<readonly string[]>([]);
  readonly entries = this._entries.asReadonly();

  add(message: string): void {
    this._entries.update((list) => [...list, message]);
  }

  clear(): void {
    this._entries.set([]);
  }
}
