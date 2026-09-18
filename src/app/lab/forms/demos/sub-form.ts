import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AddressFields, createAddressGroup } from '../address-fields';

/** Esempio 19: sotto-form riusabile con ControlContainer + viewProviders (niente CVA). */
@Component({
  selector: 'sbu-sub-form-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AddressFields, JsonPipe],
  template: `
    <form [formGroup]="checkout" (ngSubmit)="send()" class="flex flex-col gap-4 text-sm">
      <!-- formGroupName sta sull'elemento del componente: il figlio ci si aggancia -->
      <sbu-address-fields formGroupName="billing" legend="Indirizzo di fatturazione" idPrefix="sf-billing" />
      <sbu-address-fields formGroupName="shipping" legend="Indirizzo di spedizione" idPrefix="sf-shipping" />
      <div class="flex flex-wrap items-center gap-2">
        <button type="submit" class="btn">Invia</button>
        <button type="button" class="btn" (click)="copyBilling()">Copia fatturazione → spedizione</button>
        <span role="status">{{ result() }}</span>
      </div>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>checkout.value</dt>
      <dd><code>{{ checkout.value | json }}</code></dd>
      <dt>billing valid / shipping valid</dt>
      <dd>{{ checkout.controls.billing.valid }} / {{ checkout.controls.shipping.valid }}</dd>
    </dl>
  `,
})
export class SubFormDemo {
  protected readonly result = signal('');

  // il tipo del gruppo resta completo: il sotto-form non nasconde nulla al padre
  protected readonly checkout = new FormGroup({
    billing: createAddressGroup(),
    shipping: createAddressGroup(),
  });

  protected copyBilling(): void {
    this.checkout.controls.shipping.setValue(this.checkout.controls.billing.getRawValue());
  }

  protected send(): void {
    if (this.checkout.invalid) {
      this.checkout.markAllAsTouched();
      this.result.set('Completa gli indirizzi.');
      return;
    }
    this.result.set(`Spedizione a ${this.checkout.controls.shipping.controls.city.value}.`);
  }
}
