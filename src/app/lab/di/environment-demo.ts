import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { CounterStore } from './counter-store';
import { DiLogView } from './di-log-view';
import { provideLabFeature } from './feature';
import { LOGGER_COPY, MemoryLogger } from './logger';

/**
 * ESEMPIO 9 — Creare injector a mano
 *
 * Due gerarchie:
 * - ENVIRONMENT injector: platform → root (app.config) → route `providers` → createEnvironmentInjector.
 *   Contengono servizi "di applicazione", accettano EnvironmentProviders, hanno initializer.
 * - NODE (element) injector: uno per elemento con componenti/direttive, creati dal template.
 * La ricerca parte dal node injector, risale gli elementi e SOLO ALLA FINE passa all'environment
 * injector del componente (root o route). Un environment injector non vede mai i node injector.
 *
 * - `Injector.create({ providers, parent })`: injector leggero, qualunque parent (anche un nodo).
 * - `createEnvironmentInjector(providers, parent)`: environment injector figlio; va DISTRUTTO a mano
 *   con `destroy()` (che esegue gli onDestroy dei servizi che ha creato).
 */
@Component({
  selector: 'sbu-di-environment-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DiLogView],
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="createLightInjector()">Injector.create</button>
      <button type="button" class="btn" [disabled]="child()" (click)="createChild()">createEnvironmentInjector</button>
      <button type="button" class="btn" [disabled]="!child()" (click)="destroyChild()">destroy()</button>
    </div>
    <ul class="mt-3 space-y-1 text-sm" aria-live="polite">
      @for (line of results(); track $index) {
        <li>{{ line }}</li>
      }
    </ul>
    <sbu-di-log-view />
  `,
})
export class EnvironmentDemo {
  private readonly nodeInjector = inject(Injector);
  private readonly environment = inject(EnvironmentInjector);
  private readonly rootStore = inject(CounterStore);

  protected readonly child = signal<EnvironmentInjector | null>(null);
  protected readonly results = signal<readonly string[]>([]);

  constructor() {
    // chi crea un injector lo distrugge: se il componente muore prima del click su destroy()
    inject(DestroyRef).onDestroy(() => this.child()?.destroy());
  }

  protected createLightInjector(): void {
    const injector = Injector.create({
      providers: [{ provide: LOGGER_COPY, useClass: MemoryLogger }],
      parent: this.nodeInjector,
    });
    const copy = injector.get(LOGGER_COPY);
    this.results.set([
      `Injector.create → get(LOGGER_COPY): ${copy.id} (nuova istanza a ogni injector)`,
      `get(CounterStore) delegato al parent: ${injector.get(CounterStore).id} (stessa root: ${injector.get(CounterStore) === this.rootStore})`,
    ]);
  }

  protected createChild(): void {
    const child = createEnvironmentInjector([CounterStore, provideLabFeature()], this.environment, 'lab-feature');
    const store = child.get(CounterStore);
    this.child.set(child);
    this.results.set([
      `createEnvironmentInjector → get(CounterStore): ${store.id}`,
      `root: ${this.rootStore.id} · stessa istanza: ${store === this.rootStore}`,
    ]);
  }

  protected destroyChild(): void {
    this.child()?.destroy();
    this.child.set(null);
    this.results.set(['destroy(): eseguiti gli onDestroy dei servizi creati dal figlio (vedi log)']);
  }
}
