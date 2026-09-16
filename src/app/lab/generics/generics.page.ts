import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { SearchSelect } from './search-select';

type User = {
  readonly id: number;
  readonly name: string;
  readonly email: string;
};

const USERS: readonly User[] = [
  { id: 1, name: 'Mario Rossi', email: 'mario@example.com' },
  { id: 2, name: 'Maria Bianchi', email: 'maria@example.com' },
  { id: 3, name: 'Luca Verdi', email: 'luca@example.com' },
  { id: 4, name: 'Anna Rossetti', email: 'anna@example.com' },
  { id: 5, name: 'Giovanni Marini', email: 'giovanni@example.com' },
];

const CODE = {
  searchSelect: ts`
    <sbu-search-select [items]="users" key="name" label="Utente" [(selected)]="selectedUser" />
    <!-- key="nome" → errore di compilazione: 'nome' non è keyof User -->

    export class SearchSelect<T> {
      readonly items = input.required<readonly T[]>(); // T inferito da [items]
      readonly key = input.required<keyof T>();        // solo chiavi di T
      readonly label = input.required<string>();
      readonly selected = model<T>();                  // [(selected)]

      protected readonly query = signal('');

      protected readonly options = computed<Option<T>[]>(() => {
        const words = this.query().toLowerCase().split(/\\s+/).filter(Boolean);
        return this.items()
          .map((item) => ({ item, label: String(item[this.key()]) }))
          .filter(({ label }) => words.every((word) => label.toLowerCase().includes(word)));
      });

      // torna alla prima opzione ogni volta che cambiano i risultati
      protected readonly active = linkedSignal(() => {
        this.options();
        return 0;
      });
    }
  `,
  highlightMatch: ts`
    @Pipe({ name: 'highlightMatch' })
    export class HighlightMatchPipe implements PipeTransform {
      transform(text: string, query: string): TextPart[] {
        const words = query
          .trim()
          .split(/\\s+/)
          .filter(Boolean)
          .map(escapeRegExp)
          .sort((a, b) => b.length - a.length);
        if (!words.length) return [{ text, match: false }];

        // gruppo di cattura: i separatori restano, indici dispari = match
        return text
          .split(new RegExp(\`(\${words.join('|')})\`, 'gi'))
          .map((part, i) => ({ text: part, match: i % 2 === 1 }))
          .filter((part) => part.text);
      }
    }

    @for (part of option.label | highlightMatch: query(); track $index) {
      @if (part.match) {
        <mark>{{ part.text }}</mark>
      } @else {
        {{ part.text }}
      }
    }
  `,
};

/**
 * Pagina: COMPONENTI GENERICI
 *
 * - `class SearchSelect<T>`: Angular inferisce T dai binding del template (come una funzione generica).
 * - `keyof T`: la chiave è legata al tipo degli item → typo = errore in compilazione.
 * - Pipe che restituisce dati (parti del testo) invece di HTML.
 */
@Component({
  selector: 'sbu-generics-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock, SearchSelect],
  template: `
    <sbu-lab-page heading="Generici">
      <span intro>Componente generico su T, chiave <code>keyof T</code> e pipe di evidenziazione.</span>

      <sbu-example [n]="1" title="Dropdown generico con ricerca" level="intermedio">
        <div class="max-w-sm">
          <sbu-search-select [items]="users" key="name" label="Utente" [(selected)]="selectedUser" />
        </div>
        <p class="mt-3 text-sm">
          Selezionato: <strong>{{ selectedUser()?.email ?? 'nessuno' }}</strong>
        </p>
        <sbu-code [code]="code.searchSelect" label="Codice di SearchSelect" />
        <sbu-code [code]="code.highlightMatch" label="Codice della pipe highlightMatch" />
        <p note>
          T è inferito da <code>[items]</code> → <code>User</code>, quindi <code>key</code> accetta solo
          <code>'id' | 'name' | 'email'</code>. <code>key="id"</code> funziona lo stesso: il valore passa da
          <code>String()</code>.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class GenericsPage {
  protected readonly code = CODE;

  protected readonly users = USERS;
  protected readonly selectedUser = signal<User | undefined>(undefined);
}
