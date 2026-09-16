import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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
  imports: [Example, LabPage, SearchSelect],
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
  protected readonly users = USERS;
  protected readonly selectedUser = signal<User | undefined>(undefined);
}
