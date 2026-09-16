import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';

/** Esempio 4: Validators built-in, flag di stato, hasError/getError, validator dinamici. */
@Component({
  selector: 'sbu-builtin-validators-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe, ErrorMessagePipe],
  template: `
    @let email = signup.controls.email;
    @let emailInvalid = email.invalid && email.touched;
    @let age = signup.controls.age;
    @let ageInvalid = age.invalid && age.touched;
    @let username = signup.controls.username;
    @let usernameInvalid = username.invalid && username.touched;
    @let terms = signup.controls.terms;
    @let termsInvalid = terms.invalid && terms.touched;
    <form [formGroup]="signup" class="grid gap-3 sm:grid-cols-2">
      <div class="flex flex-col gap-1 text-sm">
        <label for="bv-email">Email (required, email)</label>
        <input
          id="bv-email"
          type="email"
          class="field"
          formControlName="email"
          [attr.aria-invalid]="emailInvalid"
          [attr.aria-describedby]="emailInvalid ? 'bv-email-error' : null"
        />
        @if (emailInvalid) {
          <p id="bv-email-error" class="text-destructive">{{ email.errors | errorMessage }}</p>
        }
      </div>

      <div class="flex flex-col gap-1 text-sm">
        <label for="bv-age">Età (min 18, max 120)</label>
        <input
          id="bv-age"
          type="number"
          class="field"
          formControlName="age"
          [attr.aria-invalid]="ageInvalid"
          [attr.aria-describedby]="ageInvalid ? 'bv-age-error' : null"
        />
        @if (ageInvalid) {
          <p id="bv-age-error" class="text-destructive">{{ age.errors | errorMessage }}</p>
        }
      </div>

      <div class="flex flex-col gap-1 text-sm">
        <label for="bv-username">
          Username ({{ username.hasValidator(required) ? 'required, ' : '' }}3-12, pattern)
        </label>
        <input
          id="bv-username"
          class="field"
          formControlName="username"
          [attr.aria-invalid]="usernameInvalid"
          [attr.aria-describedby]="usernameInvalid ? 'bv-username-error' : null"
        />
        @if (usernameInvalid) {
          <p id="bv-username-error" class="text-destructive">{{ username.errors | errorMessage }}</p>
        }
      </div>

      <div class="flex flex-col gap-1 text-sm">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            formControlName="terms"
            [attr.aria-invalid]="termsInvalid"
            [attr.aria-describedby]="termsInvalid ? 'bv-terms-error' : null"
          />
          Accetto i termini (requiredTrue)
        </label>
        @if (termsInvalid) {
          <p id="bv-terms-error" class="text-destructive">Devi accettare i termini.</p>
        }
      </div>
    </form>

    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="signup.markAllAsTouched()">markAllAsTouched()</button>
      <button type="button" class="btn" (click)="toggleUsernameRequired()">
        {{ username.hasValidator(required) ? 'removeValidators' : 'addValidators' }}(required)
      </button>
      <button type="button" class="btn" (click)="signup.reset()">reset()</button>
    </div>

    <table class="mt-3 w-full text-left text-sm">
      <caption class="sr-only">Stato del campo username e del form</caption>
      <thead>
        <tr class="border-b border-border">
          <th scope="col" class="py-1">flag</th>
          <th scope="col" class="py-1">username</th>
          <th scope="col" class="py-1">form</th>
        </tr>
      </thead>
      <tbody class="font-mono text-xs">
        <tr><th scope="row" class="py-0.5 font-normal">status</th><td>{{ username.status }}</td><td>{{ signup.status }}</td></tr>
        <tr><th scope="row" class="py-0.5 font-normal">valid / invalid</th><td>{{ username.valid }} / {{ username.invalid }}</td><td>{{ signup.valid }} / {{ signup.invalid }}</td></tr>
        <tr><th scope="row" class="py-0.5 font-normal">touched / untouched</th><td>{{ username.touched }} / {{ username.untouched }}</td><td>{{ signup.touched }} / {{ signup.untouched }}</td></tr>
        <tr><th scope="row" class="py-0.5 font-normal">dirty / pristine</th><td>{{ username.dirty }} / {{ username.pristine }}</td><td>{{ signup.dirty }} / {{ signup.pristine }}</td></tr>
        <tr><th scope="row" class="py-0.5 font-normal">hasError('minlength')</th><td>{{ username.hasError('minlength') }}</td><td>{{ signup.hasError('minlength', 'username') }}</td></tr>
        <tr><th scope="row" class="py-0.5 font-normal">errors</th><td>{{ username.errors | json }}</td><td>{{ signup.errors | json }}</td></tr>
      </tbody>
    </table>
    @if (username.getError('minlength'); as minlength) {
      <p class="mt-2 text-sm">getError('minlength').requiredLength = {{ minlength.requiredLength }}</p>
    }
  `,
})
export class BuiltinValidatorsDemo {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly required = Validators.required;

  protected readonly signup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    age: [18, [Validators.required, Validators.min(18), Validators.max(120)]],
    username: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(12), Validators.pattern(/^[a-z0-9_]+$/)],
    ],
    terms: [false, Validators.requiredTrue],
  });

  protected toggleUsernameRequired(): void {
    const username = this.signup.controls.username;
    if (username.hasValidator(Validators.required)) username.removeValidators(Validators.required);
    else username.addValidators(Validators.required);
    username.updateValueAndValidity(); // i nuovi validator valgono solo dal prossimo ricalcolo
  }
}
