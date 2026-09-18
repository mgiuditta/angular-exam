import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  max,
  maxLength,
  min,
  minLength,
  pattern,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { FieldErrors } from '../field-errors';

interface Product {
  name: string;
  sku: string;
  price: number | null;
  stock: number | null;
  description: string;
  contact: string;
  wantsContact: boolean;
}

/** Esempio 21 (sperimentale): il catalogo dei validator dei Signal Forms. */
@Component({
  selector: 'sbu-signal-validators-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, FieldErrors, JsonPipe],
  template: `
    <div class="grid gap-3 text-sm sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label for="sv-name">Nome (required, minLength 3, maxLength 40)</label>
        <input
          id="sv-name"
          class="field"
          [formField]="product.name"
          [attr.aria-invalid]="product.name().touched() && product.name().invalid()"
          [attr.aria-describedby]="product.name().touched() && product.name().invalid() ? 'sv-name-errors' : null"
        />
        <sbu-field-errors errorId="sv-name-errors" [field]="product.name" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="sv-sku">SKU (pattern AA-0000)</label>
        <input
          id="sv-sku"
          class="field"
          [formField]="product.sku"
          [attr.aria-invalid]="product.sku().touched() && product.sku().invalid()"
          [attr.aria-describedby]="product.sku().touched() && product.sku().invalid() ? 'sv-sku-errors' : null"
        />
        <sbu-field-errors errorId="sv-sku-errors" [field]="product.sku" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="sv-price">Prezzo (min 1, max 9999)</label>
        <input
          id="sv-price"
          type="number"
          class="field"
          [formField]="product.price"
          [attr.aria-invalid]="product.price().touched() && product.price().invalid()"
          [attr.aria-describedby]="product.price().touched() && product.price().invalid() ? 'sv-price-errors' : null"
        />
        <sbu-field-errors errorId="sv-price-errors" [field]="product.price" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="sv-stock">Giacenza (max dinamico: 10 se il prezzo supera 100)</label>
        <input
          id="sv-stock"
          type="number"
          class="field"
          [formField]="product.stock"
          [attr.aria-invalid]="product.stock().touched() && product.stock().invalid()"
          [attr.aria-describedby]="product.stock().touched() && product.stock().invalid() ? 'sv-stock-errors' : null"
        />
        <sbu-field-errors errorId="sv-stock-errors" [field]="product.stock" />
      </div>

      <div class="flex flex-col gap-1 sm:col-span-2">
        <label for="sv-description">Descrizione (validator custom: due errori insieme)</label>
        <textarea
          id="sv-description"
          class="field h-16 py-2"
          [formField]="product.description"
          [attr.aria-invalid]="product.description().touched() && product.description().invalid()"
          [attr.aria-describedby]="
            product.description().touched() && product.description().invalid() ? 'sv-description-errors' : null
          "
        ></textarea>
        <sbu-field-errors errorId="sv-description-errors" [field]="product.description" />
      </div>

      <div class="flex flex-col gap-1 sm:col-span-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" [formField]="product.wantsContact" />
          Voglio essere ricontattato (rende obbligatoria l'email: required con when)
        </label>
        <label for="sv-contact">Email di contatto</label>
        <input
          id="sv-contact"
          type="email"
          class="field"
          [formField]="product.contact"
          [attr.aria-invalid]="product.contact().touched() && product.contact().invalid()"
          [attr.aria-describedby]="
            product.contact().touched() && product.contact().invalid() ? 'sv-contact-errors' : null
          "
        />
        <sbu-field-errors errorId="sv-contact-errors" [field]="product.contact" />
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="product().markAsTouched()">markAsTouched() (mostra tutto)</button>
      <button type="button" class="btn" (click)="fillValid()">Compila valido</button>
      <button type="button" class="btn" (click)="product().reset(empty)">reset()</button>
    </div>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>name().errors() (kind dei built-in)</dt>
      <dd><code>{{ kinds(product.name().errors()) | json }}</code></dd>
      <dt>errorSummary() del form</dt>
      <dd>{{ product().errorSummary().length }} errori · valid {{ product().valid() }}</dd>
      <dt>model()</dt>
      <dd><code>{{ model() | json }}</code></dd>
    </dl>
  `,
})
export class SignalValidatorsDemo {
  protected readonly empty: Product = {
    name: '',
    sku: '',
    price: null,
    stock: null,
    description: '',
    contact: '',
    wantsContact: false,
  };
  protected readonly model = signal<Product>(this.empty);

  protected readonly product = form(this.model, (path) => {
    // required/minLength/maxLength: gli errori built-in hanno kind 'required', 'minLength', …
    required(path.name, { message: 'Il nome è obbligatorio.' });
    minLength(path.name, 3, { message: 'Almeno 3 caratteri.' });
    maxLength(path.name, 40, { message: 'Massimo 40 caratteri.' });

    // error: sostituisce l'errore di default (qui con il factory tipizzato requiredError)
    required(path.sku, { error: requiredError({ message: 'Lo SKU è obbligatorio.' }) });
    pattern(path.sku, /^[A-Z]{2}-\d{4}$/, { message: 'Formato atteso: AA-0000.' });

    required(path.price, { message: 'Il prezzo è obbligatorio.' });
    min(path.price, 1, { message: 'Almeno 1 €.' });
    max(path.price, 9999, { message: 'Massimo 9999 €.' });

    // il limite può essere una funzione del contesto: dipende da un altro campo
    max(path.stock, ({ valueOf }) => ((valueOf(path.price) ?? 0) > 100 ? 10 : 1000), {
      message: 'Sopra i 100 € la giacenza massima è 10.',
    });

    // validate può restituire un array: più errori sullo stesso campo
    validate(path.description, ({ value }) => {
      const text = value();
      if (text === '') return null;
      return [
        text.length < 20 ? { kind: 'tooShort', message: 'Almeno 20 caratteri.' } : null,
        text === text.toUpperCase() ? { kind: 'shouting', message: 'Non scrivere tutto in maiuscolo.' } : null,
      ].filter((error) => error !== null);
    });

    // when: obbligatorio solo in certe condizioni (l'equivalente della validazione condizionale)
    required(path.contact, {
      when: ({ valueOf }) => valueOf(path.wantsContact),
      message: 'Serve un contatto se vuoi essere richiamato.',
    });
    email(path.contact, { message: 'Email non valida.' });
  });

  protected fillValid(): void {
    this.model.set({
      name: 'Tastiera meccanica',
      sku: 'KB-0042',
      price: 89,
      stock: 25,
      description: 'Tastiera meccanica con switch tattili e layout italiano.',
      contact: '',
      wantsContact: false,
    });
  }

  protected kinds(errors: readonly { kind: string }[]): string[] {
    return errors.map((error) => error.kind);
  }
}
