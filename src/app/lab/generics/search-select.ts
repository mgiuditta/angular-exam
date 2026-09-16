import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, model, signal } from '@angular/core';
import { HighlightMatchPipe } from './highlight-match-pipe';

let nextId = 0;

interface Option<T> {
  readonly item: T;
  readonly label: string;
}

/**
 * Dropdown con ricerca, GENERICO su T.
 *
 *   <sbu-search-select [items]="users" key="name" label="Utente" [(selected)]="user" />
 *
 * - `SearchSelect<T>`: T viene INFERITO dal binding `[items]` (serve `strictTemplates`).
 *   Da lì `key` accetta solo `keyof T` → `key="nome"` con un typo è un errore di compilazione.
 * - `String(item[key])`: il valore di T[keyof T] può essere qualsiasi cosa → lo convertiamo
 *   in stringa per mostrarlo e cercarlo.
 * - `model<T>()`: input + output `selectedChange` in uno → supporta `[(selected)]`.
 * - Accessibilità: pattern ARIA combobox (role, aria-expanded, aria-activedescendant),
 *   frecce/Invio/Esc da tastiera, il focus resta sempre sull'input.
 */
@Component({
  selector: 'sbu-search-select',
  imports: [HighlightMatchPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label [for]="inputId" class="mb-1 block text-sm font-medium">{{ label() }}</label>
    <div class="relative">
      <input
        [id]="inputId"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="open() && options().length ? listId + '-' + active() : null"
        [value]="query()"
        (input)="search($any($event.target).value)"
        (focus)="open.set(true)"
        (blur)="open.set(false)"
        (keydown)="onKeydown($event)"
        class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <ul
        [id]="listId"
        role="listbox"
        [attr.aria-label]="label()"
        [hidden]="!open()"
        class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card p-1 text-sm text-card-foreground shadow-md"
      >
        @for (option of options(); track $index) {
          <!-- mousedown + preventDefault: il click non toglie il focus all'input (niente blur) -->
          <li
            [id]="listId + '-' + $index"
            role="option"
            [attr.aria-selected]="$index === active()"
            (mousedown)="$event.preventDefault(); select(option)"
            class="cursor-pointer rounded px-2 py-1.5"
            [class.bg-secondary]="$index === active()"
          >
            @for (part of option.label | highlightMatch: query(); track $index) {
              @if (part.match) {
                <mark class="rounded-sm bg-yellow-200 text-gray-900">{{ part.text }}</mark>
              } @else {
                {{ part.text }}
              }
            }
          </li>
        } @empty {
          <li role="option" aria-selected="false" aria-disabled="true" class="px-2 py-1.5 text-muted-foreground">
            Nessun risultato
          </li>
        }
      </ul>
    </div>
  `,
})
export class SearchSelect<T> {
  readonly items = input.required<readonly T[]>();
  readonly key = input.required<keyof T>();
  readonly label = input.required<string>();
  readonly selected = model<T>();

  protected readonly inputId = `search-select-${nextId++}`;
  protected readonly listId = `${this.inputId}-list`;
  protected readonly query = signal('');
  protected readonly open = signal(false);

  // la chiave diventa stringa in UN solo punto; il filtro vuole tutte le parole cercate
  protected readonly options = computed<Option<T>[]>(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    return this.items()
      .map((item) => ({ item, label: String(item[this.key()]) }))
      .filter(({ label }) => words.every((word) => label.toLowerCase().includes(word)));
  });

  // opzione attiva torna alla prima ogni volta che cambiano i risultati
  protected readonly active = linkedSignal(() => {
    this.options();
    return 0;
  });

  protected search(value: string): void {
    this.query.set(value);
    this.open.set(true);
  }

  protected select({ item, label }: Option<T>): void {
    this.selected.set(item);
    this.query.set(label);
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        this.open.set(true);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        if (count) this.active.update((i) => (i + step + count) % count);
        break;
      }
      case 'Enter': {
        const option = this.options()[this.active()];
        if (this.open() && option) {
          event.preventDefault();
          this.select(option);
        }
        break;
      }
      case 'Escape':
        this.open.set(false);
        break;
    }
  }
}
