import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, scan } from 'rxjs';

/** Esempio 17: updateOn 'change' (default) vs 'blur' vs 'submit'. */
@Component({
  selector: 'sbu-update-on-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form
      [formGroup]="strategies"
      (ngSubmit)="submitted.set(submitted() + 1)"
      class="grid gap-3 text-sm sm:grid-cols-3"
    >
      <div class="flex flex-col gap-1">
        <label for="uo-change">updateOn: 'change'</label>
        <input id="uo-change" class="field" formControlName="onChange" />
        <p>valore: "{{ onChangeValue() }}"</p>
        <p>emissioni: {{ onChangeCount() }}</p>
      </div>
      <div class="flex flex-col gap-1">
        <label for="uo-blur">updateOn: 'blur'</label>
        <input id="uo-blur" class="field" formControlName="onBlur" />
        <p>valore: "{{ onBlurValue() }}"</p>
        <p>emissioni: {{ onBlurCount() }}</p>
      </div>
      <div class="flex flex-col gap-1">
        <label for="uo-submit">updateOn: 'submit'</label>
        <input id="uo-submit" class="field" formControlName="onSubmit" />
        <p>valore: "{{ onSubmitValue() }}"</p>
        <p>emissioni: {{ onSubmitCount() }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:col-span-3">
        <button type="submit" class="btn">Invia (submit: {{ submitted() }})</button>
        <span aria-live="polite">
          form {{ strategies.valid ? 'valido' : 'non valido' }} · status {{ strategies.status }}
        </span>
      </div>
    </form>
  `,
})
export class UpdateOnDemo {
  protected readonly submitted = signal(0);

  // updateOn sul GRUPPO diventa il default dei figli; il figlio può sovrascriverlo
  protected readonly strategies = new FormGroup(
    {
      onChange: new FormControl('', { nonNullable: true, validators: Validators.required }),
      onBlur: new FormControl('', { nonNullable: true, validators: Validators.required, updateOn: 'blur' }),
      onSubmit: new FormControl('', { nonNullable: true, validators: Validators.required, updateOn: 'submit' }),
    },
    { updateOn: 'change' },
  );

  protected readonly onChangeValue = toSignal(this.strategies.controls.onChange.valueChanges, { initialValue: '' });
  protected readonly onBlurValue = toSignal(this.strategies.controls.onBlur.valueChanges, { initialValue: '' });
  protected readonly onSubmitValue = toSignal(this.strategies.controls.onSubmit.valueChanges, { initialValue: '' });

  protected readonly onChangeCount = this.countOf('onChange');
  protected readonly onBlurCount = this.countOf('onBlur');
  protected readonly onSubmitCount = this.countOf('onSubmit');

  private countOf(name: 'onChange' | 'onBlur' | 'onSubmit') {
    return toSignal(
      this.strategies.controls[name].valueChanges.pipe(
        map(() => 1),
        scan((total, one) => total + one, 0),
      ),
      { initialValue: 0 },
    );
  }
}
