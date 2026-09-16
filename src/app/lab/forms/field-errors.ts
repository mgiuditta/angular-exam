import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

/**
 * Errori di un campo Signal Forms, mostrati solo dopo "touched" (submit() marca tutto touched).
 * Funziona in OnPush/zoneless senza trucchi: legge signal (`touched()`, `errors()`), quindi si
 * aggiorna da solo, anche per validator asincroni. Con i reactive forms un componente così
 * NON si aggiornerebbe (control.errors non è un signal).
 */
@Component({
  selector: 'sbu-field-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <ul [id]="errorId()" class="mt-1 text-sm text-destructive">
        @for (error of state().errors(); track $index) {
          <li>{{ error.message ?? error.kind }}</li>
        }
      </ul>
    }
  `,
})
export class FieldErrors {
  readonly field = input.required<FieldTree<unknown>>();
  readonly errorId = input.required<string>();

  protected readonly state = computed(() => this.field()());
  protected readonly visible = computed(() => this.state().touched() && this.state().invalid());
}
