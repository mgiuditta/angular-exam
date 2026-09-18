import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  ControlContainer,
  FormControl,
  FormGroup,
  FormGroupName,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorMessagePipe } from './error-message';

/** Il gruppo tipizzato che questo sotto-form si aspetta di trovare nel form padre. */
export function createAddressGroup() {
  return new FormGroup({
    street: new FormControl('', { nonNullable: true, validators: Validators.required }),
    city: new FormControl('', { nonNullable: true, validators: Validators.required }),
    zip: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{5}$/)],
    }),
  });
}

export type AddressGroup = ReturnType<typeof createAddressGroup>;

/**
 * SOTTO-FORM riusabile: non è un ControlValueAccessor. Il componente riespone al proprio TEMPLATE
 * il `FormGroupName` dell'elemento host, così i `formControlName` interni trovano il gruppo del padre.
 * `viewProviders` (non `providers`): il contenitore serve alla VISTA del componente, e
 * `formControlName` lo inietta con `@Host()`, quindi si fermerebbe al confine della vista.
 * Va usato come `<sbu-address-fields formGroupName="billing" />`.
 */
@Component({
  selector: 'sbu-address-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ErrorMessagePipe],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupName }],
  template: `
    @let group = container.control;
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-1 font-medium">{{ legend() }}</legend>
      @for (field of fields; track field.name) {
        @let control = group?.get(field.name);
        <div class="flex flex-col gap-1">
          <label [for]="idPrefix() + '-' + field.name">{{ field.label }}</label>
          <input
            [id]="idPrefix() + '-' + field.name"
            class="field"
            [formControlName]="field.name"
            [autocomplete]="field.autocomplete"
            [attr.aria-invalid]="control?.invalid && control?.touched"
            [attr.aria-describedby]="
              control?.invalid && control?.touched ? idPrefix() + '-' + field.name + '-error' : null
            "
          />
          @if (control?.invalid && control?.touched) {
            <p [id]="idPrefix() + '-' + field.name + '-error'" class="text-destructive">
              {{ control?.errors | errorMessage }}
            </p>
          }
        </div>
      }
    </fieldset>
  `,
})
export class AddressFields {
  readonly legend = input('Indirizzo');
  readonly idPrefix = input.required<string>();

  /** Il contenitore iniettato è la direttiva `formGroupName` dell'elemento host. */
  protected readonly container = inject(ControlContainer);


  protected readonly fields = [
    { name: 'street', label: 'Via e numero', autocomplete: 'street-address' },
    { name: 'city', label: 'Città', autocomplete: 'address-level2' },
    { name: 'zip', label: 'CAP (5 cifre)', autocomplete: 'postal-code' },
  ] as const;
}
