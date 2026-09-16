import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  debounce,
  disabled,
  form,
  FormField,
  hidden,
  minLength,
  readonly,
  required,
  submit,
  validateAsync,
} from '@angular/forms/signals';
import { FieldErrors } from '../field-errors';
import { isUsernameTaken } from '../username-api';

type AccountType = 'privato' | 'azienda';

interface Account {
  username: string;
  type: AccountType;
  company: string;
  newsletter: boolean;
  frequency: string;
  referralCode: string;
}

/** Esempio 13 (sperimentale): validateAsync + debounce, hidden / disabled / readonly, submit() imperativo. */
@Component({
  selector: 'sbu-signal-form-logic-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, FieldErrors],
  template: `
    @let username = account.username();
    @let company = account.company();
    @let frequency = account.frequency();
    <form novalidate (submit)="onSubmit($event)" class="grid gap-3 text-sm sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label for="sfl-username">Username (prova: admin, angular, root)</label>
        <input
          id="sfl-username"
          class="field"
          autocomplete="off"
          [formField]="account.username"
          [attr.aria-invalid]="username.touched() && username.invalid()"
          [attr.aria-describedby]="username.touched() && username.invalid() ? 'sfl-username-errors' : null"
        />
        <p role="status" class="min-h-5 text-muted-foreground">
          @if (username.pending()) {
            Verifica disponibilità…
          } @else if (username.valid()) {
            Disponibile.
          }
        </p>
        <sbu-field-errors errorId="sfl-username-errors" [field]="account.username" />
      </div>

      <fieldset class="flex flex-col gap-1">
        <legend class="mb-1 font-medium">Tipo account</legend>
        <label class="flex items-center gap-2">
          <input type="radio" value="privato" [formField]="account.type" /> Privato
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" value="azienda" [formField]="account.type" /> Azienda (mostra "Ragione sociale")
        </label>
      </fieldset>

      <!-- hidden() NON nasconde nulla nel DOM: serve l'@if. Un campo hidden non conta per la validità -->
      @if (!company.hidden()) {
        <div class="flex flex-col gap-1">
          <label for="sfl-company">Ragione sociale</label>
          <input
            id="sfl-company"
            class="field"
            autocomplete="organization"
            [formField]="account.company"
            [attr.aria-invalid]="company.touched() && company.invalid()"
            [attr.aria-describedby]="company.touched() && company.invalid() ? 'sfl-company-errors' : null"
          />
          <sbu-field-errors errorId="sfl-company-errors" [field]="account.company" />
        </div>
      }

      <div class="flex flex-col gap-1">
        <label class="flex items-center gap-2">
          <input type="checkbox" [formField]="account.newsletter" /> Newsletter
        </label>
        <label for="sfl-frequency">Frequenza (disabled senza newsletter)</label>
        <input
          id="sfl-frequency"
          class="field"
          [formField]="account.frequency"
          [attr.aria-describedby]="frequency.disabled() ? 'sfl-frequency-reason' : null"
        />
        @for (reason of frequency.disabledReasons(); track $index) {
          <p id="sfl-frequency-reason" class="text-muted-foreground">{{ reason.message }}</p>
        }
      </div>

      <div class="flex flex-col gap-1">
        <label for="sfl-referral">Codice invito (readonly)</label>
        <input id="sfl-referral" class="field" [formField]="account.referralCode" />
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" class="btn">Crea account</button>
        <span role="status">{{ result() }}</span>
      </div>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>username pending / valid / invalid</dt>
      <dd>{{ username.pending() }} / {{ username.valid() }} / {{ username.invalid() }}</dd>
      <dt>form valid / invalid</dt>
      <dd>{{ account().valid() }} / {{ account().invalid() }}</dd>
      <dt>company hidden · frequency disabled · referral readonly</dt>
      <dd>{{ company.hidden() }} · {{ frequency.disabled() }} · {{ account.referralCode().readonly() }}</dd>
    </dl>
  `,
})
export class SignalFormLogicDemo {
  protected readonly model = signal<Account>({
    username: '',
    type: 'privato',
    company: '',
    newsletter: false,
    frequency: 'settimanale',
    referralCode: 'NG-2026',
  });
  protected readonly result = signal('');

  protected readonly account = form(this.model, (path) => {
    required(path.username, { message: 'Scegli uno username.' });
    minLength(path.username, 3, { message: 'Almeno 3 caratteri.' });
    // il valore arriva al modello 400ms dopo l'ultima digitazione (o subito al blur)
    debounce(path.username, 400);
    // parte SOLO se i validator sincroni passano; nel frattempo pending() = true
    validateAsync(path.username, {
      params: ({ value }) => value(),
      factory: (username) => rxResource({ params: username, stream: ({ params }) => isUsernameTaken(params) }),
      onSuccess: (taken) => (taken ? { kind: 'taken', message: 'Username già in uso.' } : null),
      onError: () => ({ kind: 'network', message: 'Verifica non riuscita, riprova.' }),
    });

    hidden(path.company, ({ valueOf }) => valueOf(path.type) !== 'azienda');
    required(path.company, { message: 'Obbligatoria per le aziende.' });

    // stringa = motivo (disabledReasons); false = abilitato
    disabled(path.frequency, ({ valueOf }) => !valueOf(path.newsletter) && 'Attiva la newsletter per sceglierla.');
    readonly(path.referralCode);
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.result.set('');
    const ok = await submit(this.account, {
      action: async (field) => {
        this.result.set(`Account "${field().value().username}" creato.`);
        return undefined;
      },
      onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      ignoreValidators: 'none', // default 'pending': invierebbe anche con la verifica asincrona in corso
    });
    if (!ok) this.result.set('Controlla i campi evidenziati.');
  }
}
