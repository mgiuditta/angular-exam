import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from './product-api';

let instances = 0;

/**
 * Rotta `products/:id` letta con `withComponentInputBinding()`:
 * il router scrive negli input con lo STESSO NOME di path param, query param, `data` e chiavi di `resolve`.
 *
 * - l'input riceve SEMPRE stringhe dall'URL: `numberAttribute` converte l'id.
 * - query param assente → l'input viene impostato a `undefined` (il default di `input()` non torna).
 * - navigando products/1 → products/2 il componente è RIUSATO (vedi "istanza"): gli input cambiano,
 *   il constructor non rigira.
 * - `[routerLink]="[]"`: comandi vuoti = URL della rotta corrente; cambia solo la query string.
 */
@Component({
  selector: 'sbu-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <h3 class="text-base font-semibold">{{ product().name }} · {{ product().price | currency: 'EUR' }}</h3>
    <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>id (path param)</dt>
      <dd>{{ id() }} <span class="text-muted-foreground">({{ typeof id() }})</span></dd>
      <dt>tab (query param)</dt>
      <dd>{{ tab() ?? 'undefined' }}</dd>
      <dt>section (data)</dt>
      <dd>{{ section() }}</dd>
      <dt>product (resolve)</dt>
      <dd>{{ product().name }}</dd>
      <dt>istanza componente</dt>
      <dd>#{{ instance }}</dd>
    </dl>
    <nav aria-label="Tab prodotto (solo query param)" class="mt-3 flex flex-wrap gap-2">
      @for (t of tabs; track t) {
        <a class="btn" [routerLink]="[]" [queryParams]="{ tab: t }" queryParamsHandling="merge">?tab={{ t }}</a>
      }
    </nav>
    <nav aria-label="Prodotti vicini" class="mt-2 flex flex-wrap gap-2">
      @if (id() > 1) {
        <a class="btn" [routerLink]="['..', id() - 1]" queryParamsHandling="preserve">◀ ['..', {{ id() - 1 }}]</a>
      }
      <a class="btn" [routerLink]="['..', id() + 1]" queryParamsHandling="preserve">['..', {{ id() + 1 }}] ▶</a>
    </nav>
  `,
})
export class ProductDetail {
  readonly id = input.required({ transform: numberAttribute });
  readonly tab = input<string>();
  readonly section = input<string>();
  readonly product = input.required<Product>();

  protected readonly instance = ++instances;
  protected readonly tabs = ['specs', 'reviews'] as const;
}
