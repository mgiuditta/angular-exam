import { ChangeDetectionStrategy, Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';
import { usernameAvailable } from '../validators';

/** Esempio 6: validator asincrono, updateOn: 'blur', stato PENDING reso reattivo con toSignal. */
@Component({
  selector: 'sbu-async-validator-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ErrorMessagePipe],
  template: `
    @let username = account.controls.username;
    @let usernameInvalid = username.invalid && username.touched;
    <form [formGroup]="account" class="flex flex-col gap-1 text-sm">
      <label for="av-username">Username (prova: admin, angular, root)</label>
      <input
        id="av-username"
        class="field max-w-xs"
        autocomplete="off"
        formControlName="username"
        [attr.aria-invalid]="usernameInvalid"
        [attr.aria-describedby]="usernameInvalid ? 'av-username-error' : 'av-username-hint'"
      />
      <p id="av-username-hint" class="text-muted-foreground">Verificato all'uscita dal campo.</p>
      <!-- status() è un signal (toSignal): la fine della verifica aggiorna la vista anche in zoneless -->
      <p role="status" class="min-h-5">
        @switch (status()) {
          @case ('PENDING') { Verifica disponibilità in corso… }
          @case ('VALID') { <span class="text-success">Username disponibile.</span> }
        }
      </p>
      @if (usernameInvalid) {
        <p id="av-username-error" class="text-destructive">{{ username.errors | errorMessage }}</p>
      }
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>status()</dt>
      <dd><code>{{ status() }}</code></dd>
      <dt>pending</dt>
      <dd>{{ username.pending }}</dd>
      <dt>value (aggiornato al blur)</dt>
      <dd><code>"{{ username.value }}"</code></dd>
    </dl>
  `,
})
export class AsyncValidatorDemo {
  protected readonly account = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
      asyncValidators: [usernameAvailable()],
      updateOn: 'blur',
    }),
  });

  protected readonly status = toSignal(this.account.controls.username.statusChanges, {
    initialValue: this.account.controls.username.status,
  });
}
