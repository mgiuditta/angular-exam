import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DiLog } from './di-log';
import { nextInstanceId } from './instance-id';

/**
 * ESEMPIO 1 — Stessa classe, due "scope"
 *
 * - `providedIn: 'root'`: se nessuno la fornisce altrove, un'unica istanza per tutta l'app.
 * - `providers: [CounterStore]` in un componente: nuova istanza per OGNI istanza del componente,
 *   che oscura quella root per il componente e i suoi discendenti.
 *
 * `inject(DestroyRef)` dipende da DOVE è stata creata l'istanza:
 * - in root → DestroyRef dell'environment injector (distrutto solo con l'app)
 * - nei providers di un componente → DestroyRef del nodo (distrutto con il componente)
 */
@Injectable({ providedIn: 'root' })
export class CounterStore {
  readonly id = nextInstanceId('CounterStore');

  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();

  constructor() {
    const log = inject(DiLog);
    log.add(`${this.id} creato`);
    inject(DestroyRef).onDestroy(() => log.add(`${this.id} distrutto`));
  }

  increment(): void {
    this._count.update((n) => n + 1);
  }
}
