import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StarRating } from '../star-rating';

/** Esempio 9: controllo custom con ControlValueAccessor usato con formControlName. */
@Component({
  selector: 'sbu-cva-rating-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StarRating],
  template: `
    @let rating = review.controls.rating;
    @let ratingInvalid = rating.invalid && rating.touched;
    <form [formGroup]="review" class="flex flex-col gap-1 text-sm">
      <sbu-star-rating
        formControlName="rating"
        label="Voto (min 1)"
        [describedBy]="ratingInvalid ? 'cva-rating-error' : null"
      />
      @if (ratingInvalid) {
        <p id="cva-rating-error" class="text-destructive">Seleziona almeno una stella.</p>
      }
    </form>
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="rating.setValue(5)">setValue(5) → writeValue</button>
      <button type="button" class="btn" (click)="toggleDisabled()">
        {{ rating.disabled ? 'enable' : 'disable' }}() → setDisabledState
      </button>
      <button type="button" class="btn" (click)="review.reset()">reset()</button>
    </div>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>value</dt>
      <dd>{{ rating.value }}</dd>
      <dt>touched / dirty</dt>
      <dd>{{ rating.touched }} / {{ rating.dirty }}</dd>
      <dt>status</dt>
      <dd><code>{{ rating.status }}</code></dd>
    </dl>
  `,
})
export class CvaRatingDemo {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly review = this.fb.group({ rating: [0, Validators.min(1)] });

  protected toggleDisabled(): void {
    const rating = this.review.controls.rating;
    if (rating.disabled) rating.enable();
    else rating.disable();
  }
}
