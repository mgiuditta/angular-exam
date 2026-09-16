import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';

/**
 * Esempio 11: template-driven (`FormsModule`). Componente separato di proposito: con FormsModule
 * importato OGNI `<form>` del template riceve `NgForm`, anche quelli pensati per altri approcci.
 */
@Component({
  selector: 'sbu-template-driven-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, JsonPipe, ErrorMessagePipe],
  template: `
    <form #tdForm="ngForm" (ngSubmit)="send(tdForm)" class="flex flex-wrap items-start gap-3 text-sm">
      <div class="flex flex-col gap-1">
        <label for="td-name">Nome (required, minlength 2)</label>
        <input
          #nameModel="ngModel"
          id="td-name"
          name="name"
          class="field"
          required
          minlength="2"
          [(ngModel)]="name"
          [attr.aria-invalid]="nameModel.invalid && nameModel.touched"
          [attr.aria-describedby]="nameModel.invalid && nameModel.touched ? 'td-name-error' : null"
        />
        @if (nameModel.invalid && nameModel.touched) {
          <p id="td-name-error" class="text-destructive">{{ nameModel.errors | errorMessage }}</p>
        }
      </div>
      <label class="mt-6 flex items-center gap-2">
        <input type="checkbox" name="newsletter" [(ngModel)]="newsletter" />
        Newsletter
      </label>
      <button type="submit" class="btn mt-5">Invia</button>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>signal name()</dt>
      <dd>"{{ name() }}"</dd>
      <dt>tdForm.value</dt>
      <dd><code>{{ tdForm.value | json }}</code></dd>
      <dt>tdForm.valid / submitted</dt>
      <dd>{{ tdForm.valid }} / {{ tdForm.submitted }}</dd>
    </dl>
    <p role="status" class="mt-2 min-h-5 text-sm">{{ result() }}</p>
  `,
})
export class TemplateDrivenDemo {
  // [(ngModel)] accetta direttamente un WritableSignal
  protected readonly name = signal('');
  protected readonly newsletter = signal(false);
  protected readonly result = signal('');

  protected send(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.result.set(`Inviato: ${this.name()}${this.newsletter() ? ' (newsletter)' : ''}`);
    form.resetForm({ name: '', newsletter: false });
  }
}
