import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CounterStore } from './counter-store';

const TEMPLATE = `
  <div class="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
    <span class="font-medium">{{ label() }}</span>
    <span>Istanza: <code>{{ store.id }}</code></span>
    <button type="button" class="btn" (click)="store.increment()">
      count: {{ store.count() }} (+1)
    </button>
  </div>
`;

/** Nessun provider: risale gli injector fino a root → tutte le card condividono la stessa istanza. */
@Component({
  selector: 'sbu-di-shared-counter-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: TEMPLATE,
})
export class SharedCounterCard {
  readonly label = input.required<string>();
  protected readonly store = inject(CounterStore);
}

/** `providers` del componente: ogni card ha la SUA istanza, distrutta insieme alla card. */
@Component({
  selector: 'sbu-di-local-counter-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CounterStore],
  template: TEMPLATE,
})
export class LocalCounterCard {
  readonly label = input.required<string>();
  protected readonly store = inject(CounterStore);
}
