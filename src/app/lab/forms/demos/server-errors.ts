import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';

/** Finta risposta 422: il server valida di nuovo e risponde con un errore per campo. */
function saveCoupon(value: { code: string; email: string }): Promise<Record<string, string>> {
  return new Promise((resolve) =>
    setTimeout(() => {
      const errors: Record<string, string> = {};
      if (value.code.trim().toUpperCase() !== 'SBU2026') errors['code'] = 'Codice sconto non riconosciuto.';
      if (value.email.endsWith('@example.com')) errors['email'] = 'Dominio email non ammesso.';
      resolve(errors);
    }, 400),
  );
}

/** Esempio 20: errori che arrivano dal server con setErrors, e come farli sparire. */
@Component({
  selector: 'sbu-server-errors-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe, ErrorMessagePipe],
  template: `
    @let code = coupon.controls.code;
    @let email = coupon.controls.email;
    <form [formGroup]="coupon" (ngSubmit)="send()" class="flex flex-col gap-3 text-sm">
      <div class="flex flex-col gap-1">
        <label for="se-code">Codice sconto (valido: SBU2026)</label>
        <input
          id="se-code"
          class="field"
          formControlName="code"
          [attr.aria-invalid]="code.invalid && code.touched"
          [attr.aria-describedby]="code.invalid && code.touched ? 'se-code-error' : null"
        />
        @if (code.invalid && code.touched) {
          <p id="se-code-error" class="text-destructive">{{ code.errors | errorMessage }}</p>
        }
      </div>
      <div class="flex flex-col gap-1">
        <label for="se-email">Email (rifiutata dal server: &#64;example.com)</label>
        <input
          id="se-email"
          type="email"
          class="field"
          formControlName="email"
          [attr.aria-invalid]="email.invalid && email.touched"
          [attr.aria-describedby]="email.invalid && email.touched ? 'se-email-error' : null"
        />
        @if (email.invalid && email.touched) {
          <p id="se-email-error" class="text-destructive">{{ email.errors | errorMessage }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="submit" class="btn" [disabled]="sending()">{{ sending() ? 'Invio…' : 'Applica' }}</button>
        <span role="status">{{ result() }}</span>
      </div>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>code.errors</dt>
      <dd><code>{{ code.errors | json }}</code></dd>
      <dt>email.errors</dt>
      <dd><code>{{ email.errors | json }}</code></dd>
      <dt>form status</dt>
      <dd>{{ coupon.status }}</dd>
    </dl>
  `,
})
export class ServerErrorsDemo {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sending = signal(false);
  protected readonly result = signal('');

  protected readonly coupon = this.fb.group({
    code: ['SCONTO10', Validators.required],
    email: ['ada@example.com', [Validators.required, Validators.email]],
  });

  constructor() {
    // un errore messo con setErrors NON viene ricalcolato: va tolto a mano quando il valore cambia
    for (const control of Object.values(this.coupon.controls)) {
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        if (control.hasError('server')) {
          const { server, ...rest } = control.errors ?? {};
          control.setErrors(Object.keys(rest).length ? rest : null); // setErrors(null) = nessun errore
        }
      });
    }
  }

  protected async send(): Promise<void> {
    this.coupon.markAllAsTouched();
    if (this.coupon.invalid) return;

    this.sending.set(true);
    this.result.set('');
    // markAsPending: lo stato del form dice "verifica in corso" anche senza validator asincroni
    this.coupon.markAsPending();
    const errors = await saveCoupon(this.coupon.getRawValue());
    this.sending.set(false);
    this.coupon.updateValueAndValidity(); // esce da PENDING ricalcolando i validator sincroni

    for (const [name, message] of Object.entries(errors)) {
      // setErrors SOSTITUISCE gli errori del controllo: conserva quelli dei validator
      const control = this.coupon.get(name);
      control?.setErrors({ ...control.errors, server: message });
      control?.markAsTouched();
    }
    this.result.set(Object.keys(errors).length ? 'Il server ha rifiutato alcuni campi.' : 'Coupon applicato!');
  }
}
