import { ChangeDetectionStrategy, Component, Injector, afterNextRender, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';
import { focusFirstInvalid } from '../focus-first-invalid';

/** Esempio 10: errori accessibili, visibili dopo touched/submit, focus sul primo campo invalido. */
@Component({
  selector: 'sbu-accessible-errors-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ErrorMessagePipe],
  template: `
    @let fullName = contact.controls.fullName;
    @let fullNameInvalid = fullName.invalid && fullName.touched;
    @let email = contact.controls.email;
    @let emailInvalid = email.invalid && email.touched;
    @let message = contact.controls.message;
    @let messageInvalid = message.invalid && message.touched;
    <form #contactForm [formGroup]="contact" (ngSubmit)="send(contactForm)" class="flex flex-col gap-3 text-sm">
      <div class="flex flex-col gap-1">
        <label for="ae-name">Nome <span aria-hidden="true">*</span></label>
        <input
          id="ae-name"
          class="field"
          autocomplete="name"
          aria-required="true"
          formControlName="fullName"
          [attr.aria-invalid]="fullNameInvalid"
          [attr.aria-describedby]="fullNameInvalid ? 'ae-name-error' : null"
        />
        @if (fullNameInvalid) {
          <p id="ae-name-error" class="text-destructive">{{ fullName.errors | errorMessage }}</p>
        }
      </div>
      <div class="flex flex-col gap-1">
        <label for="ae-email">Email <span aria-hidden="true">*</span></label>
        <input
          id="ae-email"
          type="email"
          class="field"
          autocomplete="email"
          aria-required="true"
          formControlName="email"
          [attr.aria-invalid]="emailInvalid"
          [attr.aria-describedby]="emailInvalid ? 'ae-email-error' : null"
        />
        @if (emailInvalid) {
          <p id="ae-email-error" class="text-destructive">{{ email.errors | errorMessage }}</p>
        }
      </div>
      <div class="flex flex-col gap-1">
        <label for="ae-message">Messaggio (min 10 caratteri) <span aria-hidden="true">*</span></label>
        <textarea
          id="ae-message"
          rows="3"
          class="rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-required="true"
          formControlName="message"
          [attr.aria-invalid]="messageInvalid"
          [attr.aria-describedby]="messageInvalid ? 'ae-message-error' : null"
        ></textarea>
        @if (messageInvalid) {
          <p id="ae-message-error" class="text-destructive">{{ message.errors | errorMessage }}</p>
        }
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="submit" class="btn">Invia</button>
      </div>
      <p role="status" class="min-h-5">{{ result() }}</p>
    </form>
  `,
})
export class AccessibleErrorsDemo {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly injector = inject(Injector);

  protected readonly contact = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected readonly result = signal('');

  protected send(formElement: HTMLFormElement): void {
    if (this.contact.invalid) {
      this.contact.markAllAsTouched(); // gli errori diventano visibili al prossimo render
      // focus DOPO il render: aria-describedby punta già al messaggio, lo screen reader lo legge col campo
      afterNextRender(() => focusFirstInvalid(this.contact, formElement), { injector: this.injector });
      const count = Object.values(this.contact.controls).filter((control) => control.invalid).length;
      this.result.set(`Invio non riuscito: ${count} campi da correggere.`);
      return;
    }
    this.result.set(`Messaggio inviato da ${this.contact.getRawValue().fullName}.`);
    this.contact.reset();
  }
}
