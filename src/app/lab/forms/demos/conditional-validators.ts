import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';

type Channel = 'email' | 'telefono';

/** Esempio 16: validazione condizionale con setValidators/clearValidators + updateValueAndValidity. */
@Component({
  selector: 'sbu-conditional-validators-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe, ErrorMessagePipe],
  template: `
    @let email = contact.controls.email;
    @let phone = contact.controls.phone;
    <form [formGroup]="contact" class="flex flex-col gap-3 text-sm">
      <fieldset class="flex flex-col gap-1">
        <legend class="mb-1 font-medium">Come vuoi essere ricontattato?</legend>
        <label class="flex items-center gap-2">
          <input type="radio" value="email" formControlName="channel" /> Email
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" value="telefono" formControlName="channel" /> Telefono
        </label>
      </fieldset>

      <div class="flex flex-col gap-1">
        <label for="cond-email">Email {{ email.hasValidator(required) ? '(obbligatoria)' : '(facoltativa)' }}</label>
        <input
          id="cond-email"
          type="email"
          class="field"
          formControlName="email"
          [attr.aria-invalid]="email.invalid && email.touched"
          [attr.aria-describedby]="email.invalid && email.touched ? 'cond-email-error' : null"
        />
        @if (email.invalid && email.touched) {
          <p id="cond-email-error" class="text-destructive">{{ email.errors | errorMessage }}</p>
        }
      </div>

      <div class="flex flex-col gap-1">
        <label for="cond-phone">Telefono {{ phone.hasValidator(required) ? '(obbligatorio)' : '(facoltativo)' }}</label>
        <input
          id="cond-phone"
          type="tel"
          class="field"
          formControlName="phone"
          [attr.aria-invalid]="phone.invalid && phone.touched"
          [attr.aria-describedby]="phone.invalid && phone.touched ? 'cond-phone-error' : null"
        />
        @if (phone.invalid && phone.touched) {
          <p id="cond-phone-error" class="text-destructive">{{ phone.errors | errorMessage }}</p>
        }
      </div>
    </form>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>email: hasValidator(required)</dt>
      <dd>{{ email.hasValidator(required) }} · errors <code>{{ email.errors | json }}</code></dd>
      <dt>phone: hasValidator(required)</dt>
      <dd>{{ phone.hasValidator(required) }} · errors <code>{{ phone.errors | json }}</code></dd>
      <dt>form valid</dt>
      <dd>{{ contact.valid }}</dd>
    </dl>
  `,
})
export class ConditionalValidatorsDemo {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly required = Validators.required;

  protected readonly contact = this.fb.group({
    channel: ['email' as Channel],
    email: [''],
    phone: [''],
  });

  constructor() {
    // valueChanges del solo campo che decide: niente loop, non tocchiamo il suo valore
    this.contact.controls.channel.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((channel) => this.applyValidators(channel));
    this.applyValidators(this.contact.controls.channel.value);
  }

  private applyValidators(channel: Channel): void {
    const { email, phone } = this.contact.controls;
    // setValidators SOSTITUISCE tutti i validator sincroni del controllo (clearValidators = setValidators([]))
    if (channel === 'email') {
      email.setValidators([Validators.required, Validators.email]);
      phone.clearValidators();
    } else {
      email.setValidators(Validators.email);
      phone.setValidators([Validators.required, Validators.pattern(/^\+?[0-9 ]{6,}$/)]);
    }
    // senza updateValueAndValidity lo stato resta quello calcolato con i vecchi validator
    email.updateValueAndValidity();
    phone.updateValueAndValidity();
  }
}
