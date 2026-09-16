import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { disabled, form, FormField, max, min } from '@angular/forms/signals';
import { FieldErrors } from '../field-errors';
import { RatingField } from '../rating-field';

/** Esempio 14 (sperimentale): controllo custom FormValueControl con [formField]. */
@Component({
  selector: 'sbu-signal-form-control-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, RatingField, FieldErrors],
  template: `
    @let rating = review.rating();
    <div class="flex flex-col gap-1 text-sm">
      <sbu-rating-field
        label="Voto (min 1, max dallo schema)"
        [formField]="review.rating"
        [describedBy]="rating.touched() && rating.invalid() ? 'sfc-rating-errors' : null"
      />
      <sbu-field-errors errorId="sfc-rating-errors" [field]="review.rating" />
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="rating.value.set(3)">value.set(3)</button>
      <button type="button" class="btn" (click)="locked.set(!locked())">
        {{ locked() ? 'Sblocca' : 'Blocca' }} (disabled)
      </button>
      <button type="button" class="btn" (click)="maxStars.set(maxStars() === 5 ? 10 : 5)">max: {{ maxStars() }}</button>
      <button type="button" class="btn" (click)="review().reset({ rating: 0 })">reset()</button>
    </div>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>model()</dt>
      <dd><code>rating: {{ model().rating }}</code></dd>
      <dt>touched / dirty / valid / disabled</dt>
      <dd>{{ rating.touched() }} / {{ rating.dirty() }} / {{ rating.valid() }} / {{ rating.disabled() }}</dd>
    </dl>
  `,
})
export class SignalFormControlDemo {
  protected readonly model = signal({ rating: 0 });
  protected readonly locked = signal(false);
  protected readonly maxStars = signal(5);

  protected readonly review = form(this.model, (path) => {
    min(path.rating, 1, { message: 'Seleziona almeno una stella.' });
    // la logica dello schema è reattiva: max e disabled leggono signal del componente
    max(path.rating, () => this.maxStars());
    disabled(path.rating, () => this.locked());
  });
}
