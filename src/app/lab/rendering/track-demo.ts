import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ViewStamp } from './view-stamp';

interface Item {
  readonly id: number;
  readonly name: string;
}

const INITIAL: readonly Item[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Linus' },
];
const EXTRA_NAMES = ['Margaret', 'Barbara', 'Ken', 'Dennis', 'Radia'];

/**
 * `track` dice a @for come riconoscere lo STESSO elemento tra due array.
 * - track item.id  → righe spostate/riusate per identità logica: stato DOM (input, focus, animazioni) segue l'elemento.
 * - track $index   → riuso per POSIZIONE: dopo un riordino il DOM resta fermo e cambiano solo i binding
 *                    → il testo scritto nell'input resta sulla riga sbagliata.
 * - track item     → identità dell'oggetto: con dati "ricaricati" (nuovi oggetti, stessi id) ricrea TUTTE le righe.
 * `track` è obbligatorio (in *ngFor trackBy era opzionale e il default era l'identità).
 */
@Component({
  selector: 'sbu-track-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ViewStamp],
  host: { class: 'block' },
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="reverse()">Inverti</button>
      <button type="button" class="btn" (click)="prepend()">Aggiungi in testa</button>
      <button type="button" class="btn" (click)="removeFirst()">Rimuovi primo</button>
      <button type="button" class="btn" (click)="reload()">Ricarica (nuovi oggetti, stessi id)</button>
      <button type="button" class="btn" (click)="clear()">Svuota</button>
      <button type="button" class="btn" (click)="reset()">Ripristina</button>
    </div>

    <div class="mt-3 grid gap-4 md:grid-cols-3">
      <section aria-labelledby="track-id" data-testid="list-id">
        <h3 id="track-id" class="mb-1 text-sm font-medium"><code>track item.id</code></h3>
        <ul class="flex flex-col gap-1 text-sm">
          @for (item of items(); track item.id; let i = $index, isOdd = $odd) {
            <li class="flex items-center gap-2 rounded px-1" [class.bg-muted]="isOdd">
              <sbu-view-stamp />
              <span class="w-20 truncate">{{ i + 1 }}. {{ item.name }}</span>
              <input class="field w-full min-w-0" [attr.aria-label]="'Nota per ' + item.name + ', track id'" />
            </li>
          } @empty {
            <li class="text-muted-foreground">Lista vuota (&#64;empty).</li>
          }
        </ul>
      </section>

      <section aria-labelledby="track-index" data-testid="list-index">
        <h3 id="track-index" class="mb-1 text-sm font-medium"><code>track $index</code></h3>
        <ul class="flex flex-col gap-1 text-sm">
          @for (item of items(); track $index) {
            <li class="flex items-center gap-2 rounded px-1" [class.bg-muted]="$odd">
              <sbu-view-stamp />
              <span class="w-20 truncate">{{ $index + 1 }}. {{ item.name }}</span>
              <input class="field w-full min-w-0" [attr.aria-label]="'Nota per ' + item.name + ', track indice'" />
            </li>
          } @empty {
            <li class="text-muted-foreground">Lista vuota (&#64;empty).</li>
          }
        </ul>
      </section>

      <section aria-labelledby="track-ref" data-testid="list-ref">
        <h3 id="track-ref" class="mb-1 text-sm font-medium"><code>track item</code></h3>
        <ul class="flex flex-col gap-1 text-sm">
          @for (item of items(); track item) {
            <li class="flex items-center gap-2 rounded px-1" [class.bg-muted]="$odd">
              <sbu-view-stamp />
              <span class="w-20 truncate">
                {{ item.name }}{{ $first ? ' (primo)' : '' }}{{ $last ? ' (ultimo)' : '' }}
              </span>
              <span class="text-xs text-muted-foreground">{{ $index + 1 }}/{{ $count }} {{ $even ? 'pari' : 'dispari' }}</span>
            </li>
          } @empty {
            <li class="text-muted-foreground">Lista vuota (&#64;empty).</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class TrackDemo {
  protected readonly items = signal<readonly Item[]>(INITIAL);
  private nextId = INITIAL.length + 1;

  protected reverse(): void {
    this.items.update((items) => [...items].reverse());
  }

  protected prepend(): void {
    const id = this.nextId++;
    const name = EXTRA_NAMES[(id - INITIAL.length - 1) % EXTRA_NAMES.length];
    this.items.update((items) => [{ id, name }, ...items]);
  }

  protected removeFirst(): void {
    this.items.update((items) => items.slice(1));
  }

  /** Come una nuova risposta HTTP: stessi dati, oggetti nuovi. */
  protected reload(): void {
    this.items.update((items) => items.map((item) => ({ ...item })));
  }

  protected clear(): void {
    this.items.set([]);
  }

  protected reset(): void {
    this.items.set(INITIAL);
  }
}
