import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

/** Esempio 8: FormArray dinamico con formGroupName / formArrayName / [formGroupName]="i". */
@Component({
  selector: 'sbu-form-array-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="order" class="flex flex-col gap-3 text-sm">
      <fieldset formGroupName="customer" class="flex flex-wrap gap-3">
        <legend class="mb-1 font-medium">Cliente (formGroupName)</legend>
        <label class="flex flex-col gap-1">
          Nome
          <input class="field" formControlName="name" autocomplete="name" />
        </label>
      </fieldset>

      <fieldset formArrayName="items" class="flex flex-col gap-2">
        <legend class="mb-1 font-medium">Righe ordine (formArrayName)</legend>
        @for (item of order.controls.items.controls; track item; let i = $index) {
          <div [formGroupName]="i" class="flex flex-wrap items-end gap-2">
            <label class="flex flex-col gap-1">
              Prodotto {{ i + 1 }}
              <input class="field" formControlName="product" />
            </label>
            <label class="flex flex-col gap-1">
              Quantità {{ i + 1 }}
              <input type="number" min="1" class="field w-24" formControlName="qty" />
            </label>
            <button
              type="button"
              class="btn"
              [disabled]="order.controls.items.length === 1"
              (click)="removeItem(i)"
            >
              Rimuovi <span class="sr-only">riga {{ i + 1 }}</span>
            </button>
          </div>
        }
      </fieldset>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn" (click)="addItem()">Aggiungi riga</button>
      </div>
    </form>
    <p class="mt-3 text-sm" aria-live="polite">
      {{ order.controls.items.length }} righe · pezzi totali (computed): {{ totalQty() }} · form
      {{ order.valid ? 'valido' : 'non valido' }}
    </p>
  `,
})
export class FormArrayDemo {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly order = this.fb.group({
    customer: this.fb.group({ name: ['Ada Lovelace', Validators.required] }),
    items: this.fb.array([this.createItem('Tastiera', 1)]),
  });

  private readonly orderValue = toSignal(this.order.valueChanges, { initialValue: this.order.getRawValue() });

  protected readonly totalQty = computed(() =>
    (this.orderValue().items ?? []).reduce((sum, item) => sum + (item.qty ?? 0), 0),
  );

  protected addItem(): void {
    this.order.controls.items.push(this.createItem());
  }

  protected removeItem(index: number): void {
    this.order.controls.items.removeAt(index);
  }

  private createItem(product = '', qty = 1) {
    return this.fb.group({
      product: [product, Validators.required],
      qty: [qty, [Validators.required, Validators.min(1)]],
    });
  }
}
