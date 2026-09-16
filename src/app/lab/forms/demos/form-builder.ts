import { JsonPipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';

type Theme = 'chiaro' | 'scuro';

/** Esempio 3: NonNullableFormBuilder, FormRecord con chiavi dinamiche, [formControl] standalone. */
@Component({
  selector: 'sbu-form-builder-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe, KeyValuePipe, ErrorMessagePipe],
  template: `
    @let fontSize = settings.controls.fontSize;
    @let fontSizeInvalid = fontSize.invalid && fontSize.touched;
    <form [formGroup]="settings" class="flex flex-col gap-3">
      <div class="flex flex-wrap items-start gap-3">
        <label class="flex flex-col gap-1 text-sm">
          Tema
          <select class="field" formControlName="theme">
            @for (theme of themes; track theme) {
              <option [value]="theme">{{ theme }}</option>
            }
          </select>
        </label>
        <div class="flex flex-col gap-1 text-sm">
          <label for="fb-font-size">Dimensione font (10-24)</label>
          <input
            id="fb-font-size"
            type="number"
            class="field w-28"
            formControlName="fontSize"
            [attr.aria-invalid]="fontSizeInvalid"
            [attr.aria-describedby]="fontSizeInvalid ? 'fb-font-size-error' : null"
          />
          @if (fontSizeInvalid) {
            <p id="fb-font-size-error" class="text-destructive">{{ fontSize.errors | errorMessage }}</p>
          }
        </div>
      </div>
      <fieldset formGroupName="flags" class="flex flex-wrap gap-3 text-sm">
        <legend class="mb-1 font-medium">Flag (FormRecord)</legend>
        @for (flag of settings.controls.flags.controls | keyvalue; track flag.key) {
          <label class="flex items-center gap-1">
            <input type="checkbox" [formControlName]="flag.key" />
            {{ flag.key }}
          </label>
        }
      </fieldset>
    </form>
    <div class="mt-3 flex flex-wrap items-end gap-2">
      <label class="flex flex-col gap-1 text-sm">
        Nuovo flag ([formControl] fuori dal form)
        <input class="field" [formControl]="newFlag" />
      </label>
      <button type="button" class="btn" [disabled]="!newFlag.value.trim()" (click)="addFlag()">addControl</button>
      <button type="button" class="btn" (click)="settings.reset()">reset()</button>
    </div>
    <p class="mt-3 text-sm"><code>{{ settings.value | json }}</code></p>
  `,
})
export class FormBuilderDemo {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly themes: readonly Theme[] = ['chiaro', 'scuro'];

  protected readonly settings = this.fb.group({
    theme: this.fb.control<Theme>('chiaro'), //                         FormControl<Theme>
    fontSize: [14, [Validators.min(10), Validators.max(24)]], //       FormControl<number>
    flags: this.fb.record({ beta: false, telemetria: true }), //       FormRecord<FormControl<boolean>>
  });

  protected readonly newFlag = new FormControl('', { nonNullable: true });

  protected addFlag(): void {
    this.settings.controls.flags.addControl(this.newFlag.value.trim(), this.fb.control(false));
    this.newFlag.reset();
  }
}
