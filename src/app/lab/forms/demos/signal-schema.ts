import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  apply,
  applyEach,
  applyWhen,
  form,
  FormField,
  min,
  pattern,
  required,
  schema,
  validateTree,
} from '@angular/forms/signals';
import { FieldErrors } from '../field-errors';

interface Address {
  street: string;
  city: string;
  zip: string;
}

interface Item {
  product: string;
  qty: number;
}

interface Order {
  billing: Address;
  sameAsBilling: boolean;
  shipping: Address;
  items: Item[];
}

/** Schema RIUSABILE: regole scritte una volta e applicate a più campi dello stesso tipo. */
const addressSchema = schema<Address>((path) => {
  required(path.street, { message: 'Via obbligatoria.' });
  required(path.city, { message: 'Città obbligatoria.' });
  pattern(path.zip, /^\d{5}$/, { message: 'CAP: 5 cifre.' });
});

const itemSchema = schema<Item>((path) => {
  required(path.product, { message: 'Indica il prodotto.' });
  min(path.qty, 1, { message: 'Almeno 1 pezzo.' });
});

const EMPTY_ADDRESS: Address = { street: '', city: '', zip: '' };

/** Esempio 22 (sperimentale): schema riusabili, apply / applyWhen / applyEach e validateTree. */
@Component({
  selector: 'sbu-signal-schema-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, FieldErrors, JsonPipe],
  template: `
    <div class="flex flex-col gap-4 text-sm">
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 font-medium">Fatturazione (apply dello schema)</legend>
        @for (field of addressFields; track field.key) {
          <div class="flex flex-col gap-1">
            <label [for]="'ss-billing-' + field.key">{{ field.label }}</label>
            <input
              [id]="'ss-billing-' + field.key"
              class="field"
              [formField]="order.billing[field.key]"
              [attr.aria-invalid]="order.billing[field.key]().touched() && order.billing[field.key]().invalid()"
              [attr.aria-describedby]="
                order.billing[field.key]().touched() && order.billing[field.key]().invalid()
                  ? 'ss-billing-' + field.key + '-errors'
                  : null
              "
            />
            <sbu-field-errors [errorId]="'ss-billing-' + field.key + '-errors'" [field]="order.billing[field.key]" />
          </div>
        }
      </fieldset>

      <label class="flex items-center gap-2">
        <input type="checkbox" [formField]="order.sameAsBilling" />
        Spedisci allo stesso indirizzo (applyWhen: senza spunta lo schema vale anche per la spedizione)
      </label>

      @if (!model().sameAsBilling) {
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 font-medium">Spedizione (applyWhen)</legend>
          @for (field of addressFields; track field.key) {
            <div class="flex flex-col gap-1">
              <label [for]="'ss-shipping-' + field.key">{{ field.label }}</label>
              <input
                [id]="'ss-shipping-' + field.key"
                class="field"
                [formField]="order.shipping[field.key]"
                [attr.aria-invalid]="order.shipping[field.key]().touched() && order.shipping[field.key]().invalid()"
                [attr.aria-describedby]="
                  order.shipping[field.key]().touched() && order.shipping[field.key]().invalid()
                    ? 'ss-shipping-' + field.key + '-errors'
                    : null
                "
              />
              <sbu-field-errors
                [errorId]="'ss-shipping-' + field.key + '-errors'"
                [field]="order.shipping[field.key]"
              />
            </div>
          }
        </fieldset>
      }

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 font-medium">Righe (applyEach + validateTree sui duplicati)</legend>
        @for (item of order.items; track $index; let i = $index) {
          <div class="flex flex-wrap items-start gap-2">
            <div class="flex flex-col gap-1">
              <label [for]="'ss-item-' + i">Prodotto {{ i + 1 }}</label>
              <input
                [id]="'ss-item-' + i"
                class="field"
                [formField]="item.product"
                [attr.aria-invalid]="item.product().touched() && item.product().invalid()"
                [attr.aria-describedby]="
                  item.product().touched() && item.product().invalid() ? 'ss-item-' + i + '-errors' : null
                "
              />
              <sbu-field-errors [errorId]="'ss-item-' + i + '-errors'" [field]="item.product" />
            </div>
            <div class="flex flex-col gap-1">
              <label [for]="'ss-qty-' + i">Quantità {{ i + 1 }}</label>
              <input [id]="'ss-qty-' + i" type="number" class="field w-24" [formField]="item.qty" />
              <sbu-field-errors [errorId]="'ss-qty-' + i + '-errors'" [field]="item.qty" />
            </div>
            <button type="button" class="btn mt-6" [disabled]="model().items.length === 1" (click)="removeItem(i)">
              Rimuovi <span class="sr-only">riga {{ i + 1 }}</span>
            </button>
          </div>
        }
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="addItem()">Aggiungi riga</button>
          <button type="button" class="btn" (click)="addDuplicate()">Aggiungi un duplicato</button>
          <button type="button" class="btn" (click)="order().markAsTouched()">markAsTouched()</button>
        </div>
      </fieldset>
    </div>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>order valid</dt>
      <dd>{{ order().valid() }} · {{ order().errorSummary().length }} errori in tutto l'albero</dd>
      <dt>shipping valid (senza schema quando è "come fatturazione")</dt>
      <dd>{{ order.shipping().valid() }}</dd>
      <dt>model()</dt>
      <dd><code>{{ model() | json }}</code></dd>
    </dl>
  `,
})
export class SignalSchemaDemo {
  protected readonly addressFields = [
    { key: 'street', label: 'Via e numero' },
    { key: 'city', label: 'Città' },
    { key: 'zip', label: 'CAP' },
  ] as const;

  protected readonly model = signal<Order>({
    billing: { ...EMPTY_ADDRESS },
    sameAsBilling: true,
    shipping: { ...EMPTY_ADDRESS },
    items: [{ product: 'Tastiera', qty: 1 }],
  });

  protected readonly order = form(this.model, (path) => {
    apply(path.billing, addressSchema); // stesse regole, campo diverso
    applyWhen(path.shipping, ({ valueOf }) => !valueOf(path.sameAsBilling), addressSchema);
    applyEach(path.items, itemSchema); // a OGNI elemento dell'array

    // validateTree: un solo validator sull'array che può puntare l'errore sul figlio giusto
    validateTree(path.items, ({ value, fieldTree }) => {
      const products = value().map((item) => item.product.trim().toLowerCase());
      return products
        .map((product, index) =>
          product !== '' && products.indexOf(product) !== index
            ? {
                kind: 'duplicate',
                message: 'Prodotto già presente in un’altra riga.',
                fieldTree: fieldTree[index].product,
              }
            : null,
        )
        .filter((error) => error !== null);
    });
  });

  protected addItem(product = '', qty = 1): void {
    // il modello è l'unica fonte di verità: si aggiorna l'array, i campi seguono
    this.model.update((order) => ({ ...order, items: [...order.items, { product, qty }] }));
  }

  protected addDuplicate(): void {
    this.addItem(this.model().items[0]?.product ?? 'Tastiera');
  }

  protected removeItem(index: number): void {
    this.model.update((order) => ({ ...order, items: order.items.filter((_, i) => i !== index) }));
  }
}
