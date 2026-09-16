import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ControlEvent,
  FormResetEvent,
  FormSubmittedEvent,
  NonNullableFormBuilder,
  PristineChangeEvent,
  ReactiveFormsModule,
  StatusChangeEvent,
  TouchedChangeEvent,
  ValueChangeEvent,
} from '@angular/forms';
import { map, scan } from 'rxjs';

const PRODUCTS = ['tastiera', 'mouse', 'monitor', 'microfono', 'webcam'];

/** Esempio 7: valueChanges → toSignal + computed, e l'Observable unificato `events`. */
@Component({
  selector: 'sbu-form-events-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="search" class="flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1 text-sm">
        Cerca prodotto
        <input class="field" formControlName="query" />
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" formControlName="startsWith" />
        Solo iniziali
      </label>
      <button type="submit" class="btn">Invia (FormSubmittedEvent)</button>
      <button type="button" class="btn" (click)="search.reset()">reset() (FormResetEvent)</button>
    </form>
    <p class="mt-3 text-sm" aria-live="polite">Risultati (computed): {{ results().join(', ') || '—' }}</p>
    <ol role="log" aria-label="Eventi del form" class="mt-3 max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
      @for (line of eventLog(); track $index) {
        <li>{{ line }}</li>
      }
    </ol>
  `,
})
export class FormEventsDemo {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly search = this.fb.group({ query: '', startsWith: false });

  // valueChanges NON emette il valore iniziale → initialValue obbligatorio per un tipo senza undefined
  private readonly filters = toSignal(this.search.valueChanges, { initialValue: this.search.getRawValue() });

  protected readonly results = computed(() => {
    const { query = '', startsWith = false } = this.filters();
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((product) => (startsWith ? product.startsWith(q) : product.includes(q)));
  });

  protected readonly eventLog = toSignal(
    this.search.events.pipe(
      map((event) => this.describe(event)),
      scan((log: readonly string[], line) => [line, ...log].slice(0, 12), []),
    ),
    { initialValue: [] },
  );

  private describe(event: ControlEvent): string {
    const source = event.source === this.search ? 'form' : 'campo';
    if (event instanceof ValueChangeEvent) return `ValueChangeEvent    (${source}) ${JSON.stringify(event.value)}`;
    if (event instanceof StatusChangeEvent) return `StatusChangeEvent   (${source}) ${event.status}`;
    if (event instanceof TouchedChangeEvent) return `TouchedChangeEvent  (${source}) ${event.touched}`;
    if (event instanceof PristineChangeEvent) return `PristineChangeEvent (${source}) ${event.pristine}`;
    if (event instanceof FormSubmittedEvent) return 'FormSubmittedEvent';
    if (event instanceof FormResetEvent) return 'FormResetEvent';
    return event.constructor.name;
  }
}
