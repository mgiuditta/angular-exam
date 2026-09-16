import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { email, form, FormField, FormRoot, min, minLength, required, validate } from '@angular/forms/signals';
import { FieldErrors } from '../field-errors';

interface Registration {
  name: string;
  email: string;
  age: number | null;
  password: string;
  confirm: string;
}

const EMPTY: Registration = { name: '', email: '', age: null, password: '', confirm: '' };

/** Esempio 12 (sperimentale): Signal Forms, form() + schema + [formField] + [formRoot] con submission. */
@Component({
  selector: 'sbu-signal-form-basics-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, FormRoot, FieldErrors, JsonPipe],
  template: `
    @let name = registration.name();
    @let mail = registration.email();
    @let age = registration.age();
    @let password = registration.password();
    @let confirm = registration.confirm();
    <form [formRoot]="registration" class="grid gap-3 text-sm sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label for="sfb-name">Nome (prova "errore" → errore dal server)</label>
        <input
          id="sfb-name"
          class="field"
          autocomplete="name"
          [formField]="registration.name"
          [attr.aria-invalid]="name.touched() && name.invalid()"
          [attr.aria-describedby]="name.touched() && name.invalid() ? 'sfb-name-errors' : null"
        />
        <sbu-field-errors errorId="sfb-name-errors" [field]="registration.name" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="sfb-email">Email</label>
        <input
          id="sfb-email"
          type="email"
          class="field"
          autocomplete="email"
          [formField]="registration.email"
          [attr.aria-invalid]="mail.touched() && mail.invalid()"
          [attr.aria-describedby]="mail.touched() && mail.invalid() ? 'sfb-email-errors' : null"
        />
        <sbu-field-errors errorId="sfb-email-errors" [field]="registration.email" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="sfb-age">Età (number | null, min 18)</label>
        <input
          id="sfb-age"
          type="number"
          class="field"
          [formField]="registration.age"
          [attr.aria-invalid]="age.touched() && age.invalid()"
          [attr.aria-describedby]="age.touched() && age.invalid() ? 'sfb-age-errors' : null"
        />
        <sbu-field-errors errorId="sfb-age-errors" [field]="registration.age" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="sfb-password">Password (min 8)</label>
        <input
          id="sfb-password"
          type="password"
          class="field"
          autocomplete="new-password"
          [formField]="registration.password"
          [attr.aria-invalid]="password.touched() && password.invalid()"
          [attr.aria-describedby]="password.touched() && password.invalid() ? 'sfb-password-errors' : null"
        />
        <sbu-field-errors errorId="sfb-password-errors" [field]="registration.password" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="sfb-confirm">Conferma password</label>
        <input
          id="sfb-confirm"
          type="password"
          class="field"
          autocomplete="new-password"
          [formField]="registration.confirm"
          [attr.aria-invalid]="confirm.touched() && confirm.invalid()"
          [attr.aria-describedby]="confirm.touched() && confirm.invalid() ? 'sfb-confirm-errors' : null"
        />
        <sbu-field-errors errorId="sfb-confirm-errors" [field]="registration.confirm" />
      </div>
      <div class="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" class="btn">
          {{ registration().submitting() ? 'Invio…' : 'Registrati' }}
        </button>
        <button type="button" class="btn" (click)="fillValid()">Compila dati validi</button>
        <button type="button" class="btn" (click)="registration().reset(empty)">reset()</button>
      </div>
      <p role="status" class="min-h-5 sm:col-span-2">{{ result() }}</p>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>model() (fonte di verità)</dt>
      <dd><code>{{ model() | json }}</code></dd>
      <dt>form valid / touched / dirty</dt>
      <dd>{{ registration().valid() }} / {{ registration().touched() }} / {{ registration().dirty() }}</dd>
      <dt>errorSummary() (form)</dt>
      <dd>{{ registration().errorSummary().length }} errori</dd>
    </dl>
  `,
})
export class SignalFormBasicsDemo {
  protected readonly empty = EMPTY;
  protected readonly model = signal<Registration>(EMPTY);
  protected readonly result = signal('');

  protected readonly registration = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Il nome è obbligatorio.' });
      required(path.email, { message: "L'email è obbligatoria." });
      email(path.email, { message: 'Indirizzo email non valido.' });
      required(path.age, { message: "L'età è obbligatoria." });
      min(path.age, 18, { message: 'Devi essere maggiorenne.' });
      required(path.password, { message: 'La password è obbligatoria.' });
      minLength(path.password, 8, { message: 'Almeno 8 caratteri.' });
      // validator custom: ritorna null oppure { kind, message }. valueOf() legge un altro campo (reattivo)
      validate(path.confirm, ({ value, valueOf }) =>
        value() === valueOf(path.password) ? null : { kind: 'mismatch', message: 'Le password non coincidono.' },
      );
    },
    {
      submission: {
        // gira solo se il form non ha errori; ritorna errori "dal server" (o undefined se ok)
        action: async (field) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          if (field.name().value().trim().toLowerCase() === 'errore') {
            return { fieldTree: field.name, kind: 'server', message: 'Nome già registrato (errore dal server).' };
          }
          this.result.set(`Registrato: ${field().value().email}`);
          return undefined;
        },
        // submit() ha già marcato tutto touched: porto il focus sul primo campo con errori
        onInvalid: (field) => {
          this.result.set('Correggi i campi evidenziati.');
          field().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  protected fillValid(): void {
    this.model.set({ name: 'Ada', email: 'ada@example.com', age: 36, password: 'segreta123', confirm: 'segreta123' });
  }
}
