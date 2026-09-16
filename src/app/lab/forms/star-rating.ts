import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Stars } from './stars';

/**
 * Controllo custom per reactive (e template-driven) forms: implementa `ControlValueAccessor`
 * e si registra come `NG_VALUE_ACCESSOR`. Così funziona con `formControlName`, `[formControl]`, `ngModel`.
 *
 *   <sbu-star-rating formControlName="rating" label="Voto" />
 *
 * Direzioni del flusso:
 * - modello → vista: il forms module chiama `writeValue` (setValue/patchValue/reset) e `setDisabledState`
 * - vista → modello: chiamiamo la callback ricevuta in `registerOnChange` / `registerOnTouched`
 * Zoneless + OnPush: `writeValue` scrive in un signal → la vista si aggiorna da sola.
 */
@Component({
  selector: 'sbu-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Stars],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }],
  template: `
    <sbu-stars
      [value]="value()"
      [label]="label()"
      [disabled]="disabled()"
      [describedBy]="describedBy()"
      (rate)="select($event)"
      (leave)="onTouched()"
    />
  `,
})
export class StarRating implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly describedBy = input<string | null>(null);

  protected readonly value = signal(0);
  protected readonly disabled = signal(false);
  private onChange: (value: number) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.value.set(value ?? 0);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected select(star: number): void {
    this.value.set(star);
    this.onChange(star); // → control.setValue(star) + dirty
  }
}
