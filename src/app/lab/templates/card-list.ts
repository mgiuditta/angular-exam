import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChild,
  input,
} from '@angular/core';

export interface ItemContext<T> {
  $implicit: T;
  index: number;
}

/**
 * ESEMPIO 4 — Componente con template personalizzabile dall'esterno
 *
 * Due modi per ricevere il template (entrambi molto usati nelle librerie UI):
 *   A) input:     <sbu-card-list [items]="xs" [itemTemplate]="tpl" />
 *   B) proiezione <sbu-card-list [items]="xs"><ng-template let-x let-i="index">…</ng-template></sbu-card-list>
 * Se nessuno dei due c'è → template di default interno.
 *
 * Domanda d'esame — dove "vive" la view creata da ngTemplateOutlet?
 * - i binding del template vengono valutati nel contesto in cui il template è DICHIARATO
 *   (il padre: può leggere i suoi signal/metodi), non dove viene inserito.
 * - la view è INSERITA qui (nel container dell'outlet) → viene controllata con questo componente.
 *   Se il padre è OnPush e cambia, Angular rinfresca comunque le "transplanted views".
 *
 * Lifecycle:
 * - `contentChild` legge i nodi proiettati → pronto (garantito) da ngAfterContentInit;
 *   essendo un signal, `computed` si aggiorna da solo quando arriva.
 */
@Component({
  selector: 'sbu-card-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <ul class="grid gap-2 sm:grid-cols-3">
      @for (item of items(); track $index) {
        <li class="rounded-md border border-border p-2 text-sm">
          <ng-container
            [ngTemplateOutlet]="template() ?? defaultTemplate"
            [ngTemplateOutletContext]="{ $implicit: item, index: $index }"
          />
        </li>
      }
    </ul>

    <ng-template #defaultTemplate let-item let-i="index">{{ i + 1 }}. {{ item }}</ng-template>
  `,
})
export class CardList<T> {
  readonly items = input.required<readonly T[]>();
  readonly itemTemplate = input<TemplateRef<ItemContext<T>>>();

  private readonly projected = contentChild<TemplateRef<ItemContext<T>>>(TemplateRef);

  protected readonly template = computed(() => this.itemTemplate() ?? this.projected());
}
