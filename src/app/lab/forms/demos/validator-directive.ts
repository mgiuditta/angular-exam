import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';
import { ForbiddenWordValidator, UsernameFreeValidator } from '../validator-directives';

/** Esempio 18: validator scritti come DIRETTIVE (NG_VALIDATORS / NG_ASYNC_VALIDATORS). */
@Component({
  selector: 'sbu-validator-directive-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    JsonPipe,
    ErrorMessagePipe,
    ForbiddenWordValidator,
    UsernameFreeValidator,
  ],
  template: `
    <div class="flex flex-col gap-4 text-sm">
      <form #tdForm="ngForm" class="flex flex-col gap-1">
        <label for="vd-td">Template-driven: la direttiva è un attributo del template</label>
        <input
          #titleModel="ngModel"
          id="vd-td"
          name="title"
          class="field"
          required
          [sbuForbiddenWord]="word()"
          [(ngModel)]="title"
          [attr.aria-invalid]="titleModel.invalid && titleModel.touched"
          [attr.aria-describedby]="titleModel.invalid && titleModel.touched ? 'vd-td-error' : null"
        />
        @if (titleModel.invalid && titleModel.touched) {
          <p id="vd-td-error" class="text-destructive">{{ titleModel.errors | errorMessage }}</p>
        }
        <p>tdForm.valid: {{ tdForm.valid }}</p>
      </form>

      <div class="flex flex-col gap-1">
        <label for="vd-reactive">Reactive: la stessa direttiva su [formControl]</label>
        <input
          id="vd-reactive"
          class="field"
          [formControl]="slogan"
          [sbuForbiddenWord]="word()"
          [attr.aria-invalid]="slogan.invalid && slogan.touched"
          [attr.aria-describedby]="slogan.invalid && slogan.touched ? 'vd-reactive-error' : null"
        />
        @if (slogan.invalid && slogan.touched) {
          <p id="vd-reactive-error" class="text-destructive">{{ slogan.errors | errorMessage }}</p>
        }
      </div>

      <div class="flex flex-col gap-1">
        <label for="vd-async">Direttiva ASINCRONA: username (prova admin, angular, root)</label>
        <input
          id="vd-async"
          class="field"
          autocomplete="off"
          [formControl]="username"
          [sbuUsernameFree]="400"
          [attr.aria-invalid]="username.invalid && username.touched"
          [attr.aria-describedby]="username.invalid && username.touched ? 'vd-async-error' : null"
        />
        <p role="status" class="min-h-5">{{ usernameStatus() === 'PENDING' ? 'Verifica…' : '' }}</p>
        @if (username.invalid && username.touched) {
          <p id="vd-async-error" class="text-destructive">{{ username.errors | errorMessage }}</p>
        }
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn" (click)="toggleWord()">
          Parola vietata: "{{ word() }}" (cambia → i controlli rivalidano)
        </button>
      </div>
    </div>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>slogan.errors</dt>
      <dd><code>{{ slogan.errors | json }}</code></dd>
      <dt>username.status</dt>
      <dd>{{ usernameStatus() }}</dd>
    </dl>
  `,
})
export class ValidatorDirectiveDemo {
  protected readonly title = signal('promo gratis');
  protected readonly word = signal('gratis');
  protected readonly slogan = new FormControl('tutto gratis', { nonNullable: true });
  protected readonly username = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });

  // status non è un signal: senza toSignal la vista non vedrebbe la fine della verifica async
  protected readonly usernameStatus = toSignal(this.username.statusChanges, { initialValue: this.username.status });

  protected toggleWord(): void {
    this.word.update((word) => (word === 'gratis' ? 'promo' : 'gratis'));
  }
}
