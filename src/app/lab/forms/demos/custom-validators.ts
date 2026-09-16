import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';
import { matchFields, strongPassword } from '../validators';

/** Esempio 5: ValidatorFn custom parametrico + validator di gruppo (conferma password). */
@Component({
  selector: 'sbu-custom-validators-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe, ErrorMessagePipe],
  template: `
    @let password = passwords.controls.password;
    @let passwordInvalid = password.invalid && password.touched;
    @let confirm = passwords.controls.confirm;
    @let mismatch = passwords.hasError('fieldsMismatch');
    @let confirmInvalid = confirm.touched && (confirm.invalid || mismatch);
    <form [formGroup]="passwords" class="grid gap-3 sm:grid-cols-2">
      <div class="flex flex-col gap-1 text-sm">
        <label for="cv-password">Password (required + strongPassword(3))</label>
        <input
          id="cv-password"
          type="password"
          autocomplete="new-password"
          class="field"
          formControlName="password"
          [attr.aria-invalid]="passwordInvalid"
          [attr.aria-describedby]="passwordInvalid ? 'cv-password-error' : null"
        />
        @if (passwordInvalid) {
          <p id="cv-password-error" class="text-destructive">{{ password.errors | errorMessage }}</p>
        }
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="cv-confirm">Conferma password</label>
        <input
          id="cv-confirm"
          type="password"
          autocomplete="new-password"
          class="field"
          formControlName="confirm"
          [attr.aria-invalid]="confirmInvalid"
          [attr.aria-describedby]="confirmInvalid ? 'cv-confirm-error' : null"
        />
        @if (confirmInvalid) {
          <!-- l'errore del gruppo viene mostrato vicino al campo che l'utente deve correggere -->
          <p id="cv-confirm-error" class="text-destructive">
            {{ (confirm.errors ?? passwords.errors) | errorMessage }}
          </p>
        }
      </div>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>password.errors</dt>
      <dd><code>{{ password.errors | json }}</code></dd>
      <dt>confirm.errors</dt>
      <dd><code>{{ confirm.errors | json }}</code></dd>
      <dt>passwords.errors (gruppo)</dt>
      <dd><code>{{ passwords.errors | json }}</code></dd>
    </dl>
  `,
})
export class CustomValidatorsDemo {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly passwords = this.fb.group(
    {
      password: ['', [Validators.required, strongPassword(3)]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirm') },
  );
}
