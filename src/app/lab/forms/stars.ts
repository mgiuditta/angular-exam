import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

let nextId = 0;

/**
 * UI "stelle" PRESENTAZIONALE: non sa nulla di form. La riusano due adapter:
 * - `StarRating`  → ControlValueAccessor (reactive / template-driven forms)
 * - `RatingField` → FormValueControl (Signal Forms)
 *
 * Accessibilità: radio nativi (frecce da tastiera, un solo tab stop) nascosti con `sr-only`,
 * `fieldset` + `legend` come nome del gruppo, focus visibile sulla label che contiene il radio.
 */
@Component({
  selector: 'sbu-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <fieldset
      [disabled]="disabled()"
      [attr.aria-describedby]="describedBy()"
      (focusout)="onFocusOut($event)"
      class="disabled:opacity-50"
    >
      <legend class="mb-1 text-sm font-medium">{{ label() }}</legend>
      <div class="flex gap-1">
        @for (star of stars(); track star) {
          <label
            class="cursor-pointer rounded px-1 text-2xl leading-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
          >
            <input
              type="radio"
              class="sr-only"
              [name]="name"
              [value]="star"
              [checked]="star === value()"
              (change)="rate.emit(star)"
            />
            <span aria-hidden="true">{{ star <= value() ? '★' : '☆' }}</span>
            <span class="sr-only">{{ star }} su {{ max() }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class Stars {
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  readonly max = input(5);
  readonly disabled = input(false);
  readonly describedBy = input<string | null>(null);

  /** Stella scelta dall'utente. */
  readonly rate = output<number>();
  /** Il focus è uscito dal gruppo (→ "touched"). */
  readonly leave = output<void>();

  protected readonly name = `stars-${nextId++}`;
  protected readonly stars = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));

  // focusout fa bubbling: ignora gli spostamenti tra una stella e l'altra
  protected onFocusOut(event: FocusEvent): void {
    const group = event.currentTarget as HTMLElement;
    if (!group.contains(event.relatedTarget as Node | null)) this.leave.emit();
  }
}
