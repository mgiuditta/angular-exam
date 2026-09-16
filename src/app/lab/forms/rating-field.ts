import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { Stars } from './stars';

/**
 * Controllo custom per Signal Forms (sperimentale): implementa `FormValueControl<number>`.
 * Nessun provider, nessuna callback: il contratto è fatto di signal con nomi riservati.
 *
 *   <sbu-rating-field [formField]="reviewForm.rating" label="Voto" />
 *
 * - `value = model()`       → UNICO membro obbligatorio, sincronizzato col campo (two-way)
 * - `touched = model()`     → scriverlo a true marca il campo come touched
 * - `disabled`, `max`, `invalid`, `errors`, … → input (opzionali) valorizzati AUTOMATICAMENTE dalla direttiva `[formField]`
 *   leggendo lo schema (es. `max(p.rating, 5)` arriva qui come input `max`).
 */
@Component({
  selector: 'sbu-rating-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Stars],
  template: `
    <sbu-stars
      [value]="value()"
      [label]="label()"
      [max]="max() ?? 5"
      [disabled]="disabled()"
      [describedBy]="describedBy()"
      (rate)="value.set($event)"
      (leave)="touched.set(true)"
    />
  `,
})
export class RatingField implements FormValueControl<number> {
  readonly value = model(0);
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly max = input<number | undefined>(undefined);

  // input "nostri": nomi non riservati dal contratto
  readonly label = input.required<string>();
  readonly describedBy = input<string | null>(null);
}
