import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Example, LabPage } from '../shared/example';
import { InfoAlert, WarningAlert } from './alerts';
import { CardList } from './card-list';
import { Delay } from './delay';
import { Repeat } from './repeat';
import { Tabs } from './tabs';
import { Unless } from './unless';

interface User {
  id: number;
  name: string;
}

/**
 * Pagina: NG-CONTAINER, NG-TEMPLATE, OUTLET, DIRETTIVE STRUTTURALI
 *
 * Mappa mentale per l'esame:
 * - <ng-container>  → nodo LOGICO: nel DOM diventa un commento. Raggruppa senza wrapper,
 *                     ospita direttive strutturali/outlet. NON può avere class/style/eventi DOM.
 * - <ng-template>   → PROGETTO di view: non renderizza nulla e non istanzia nulla finché qualcuno
 *                     non crea una embedded view (outlet, @if interno, vcr.createEmbeddedView).
 * - <ng-content>    → PROIEZIONE: il contenuto è creato dal padre SEMPRE (anche se non mostrato).
 * - `*direttiva`    → zucchero sintattico per <ng-template [direttiva]>.
 * - @if/@for/@switch → control flow built-in: compilato, non sono direttive (niente import).
 */
@Component({
  selector: 'sbu-templates-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, NgTemplateOutlet, NgComponentOutlet, CardList, Unless, Repeat, Delay, Tabs],
  template: `
    <sbu-lab-page heading="ng-container, ng-template, outlet">
      <span intro>Dal raggruppamento senza DOM alle direttive strutturali con context tipizzato.</span>

      <sbu-example [n]="1" title="ng-container: raggruppare senza wrapper">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
          @for (user of users(); track user.id) {
            <!-- dt+dd devono essere figli diretti di <dl>: un <div> wrapper sarebbe HTML/ARIA non valido -->
            <ng-container>
              <dt class="font-medium">#{{ user.id }}</dt>
              <dd>{{ user.name }}</dd>
            </ng-container>
          }
        </dl>
        <ng-container ngProjectAs="[note]">
          <p><code>&lt;ng-container&gt;</code> diventa un commento nel DOM: ispeziona l'HTML.</p>
          <p>Questa nota è proiettata nello slot <code>[note]</code> grazie a <code>ngProjectAs</code>.</p>
        </ng-container>
      </sbu-example>

      <sbu-example [n]="2" title="ng-template + ngTemplateOutlet: riusare un blocco">
        <ng-template #spinner>
          <span role="status" class="text-sm text-muted-foreground">⏳ Caricamento…</span>
        </ng-template>

        <button type="button" class="btn" (click)="loaded.set(!loaded())">Toggle caricamento</button>
        <div class="mt-2 flex gap-6">
          <div>
            @if (loaded()) {
              <span>Sezione A pronta</span>
            } @else {
              <ng-container [ngTemplateOutlet]="spinner" />
            }
          </div>
          <div>
            @if (loaded()) {
              <span>Sezione B pronta</span>
            } @else {
              <ng-container *ngTemplateOutlet="spinner" />
            }
          </div>
          <div>
            <ng-container [ngTemplateOutlet]="spinner" />
          </div>
        </div>
        <p note>
          Stesso template, due embedded view indipendenti. Forma a binding
          <code>[ngTemplateOutlet]</code> e forma strutturale <code>*ngTemplateOutlet</code> sono equivalenti.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="Outlet con context: $implicit e variabili nominate" level="intermedio">
        <ng-template #row let-user let-position="position" let-total="total">
          <li>{{ position }}/{{ total }} — {{ user.name }}</li>
        </ng-template>

        <ul class="text-sm">
          @for (user of users(); track user.id; let i = $index) {
            <ng-container
              *ngTemplateOutlet="row; context: { $implicit: user, position: i + 1, total: users().length }"
            />
          }
        </ul>
        <p note>
          <code>let-user</code> riceve <code>$implicit</code>; <code>let-position="position"</code> legge la chiave
          omonima. Il context senza type guard è <code>any</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Componente con template personalizzabile" level="intermedio">
        <h3 class="mb-1 text-sm font-medium">Default</h3>
        <sbu-card-list [items]="names()" />

        <h3 class="mb-1 mt-3 text-sm font-medium">Template via input</h3>
        <sbu-card-list [items]="names()" [itemTemplate]="badge" />
        <ng-template #badge let-name>
          <span class="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{{ name }}</span>
        </ng-template>

        <h3 class="mb-1 mt-3 text-sm font-medium">Template proiettato (legge un signal del padre)</h3>
        <sbu-card-list [items]="names()">
          <ng-template let-name let-i="index">
            <strong>{{ name }}</strong> {{ i === selectedIndex() ? '← selezionato' : '' }}
          </ng-template>
        </sbu-card-list>
        <button type="button" class="btn mt-2" (click)="selectNext()">Seleziona successivo</button>
        <p note>Il template è valutato nel contesto del padre (<code>selectedIndex()</code>) ma inserito nel figlio.</p>
      </sbu-example>

      <sbu-example [n]="5" title="ngComponentOutlet: componente scelto a runtime" level="intermedio">
        <button type="button" class="btn" (click)="warning.set(!warning())">Cambia tipo</button>
        <div class="mt-2">
          <ng-container *ngComponentOutlet="alertComponent(); inputs: { message: alertMessage() }" />
        </div>
        <p note>
          Cambiare il tipo distrugge il vecchio componente e crea il nuovo (lifecycle completo).
          Cambiare solo <code>inputs</code> aggiorna gli input dell'istanza esistente.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="Strutturale base: *sbuUnless con else" level="avanzato">
        <button type="button" class="btn" (click)="loggedIn.set(!loggedIn())">
          {{ loggedIn() ? 'Logout' : 'Login' }}
        </button>
        <p *sbuUnless="loggedIn(); else welcome" class="mt-2">Effettua il login per continuare.</p>
        <ng-template #welcome><p class="mt-2">Bentornato 👋</p></ng-template>
        <p note>Desugaring: <code>&lt;ng-template [sbuUnless]="loggedIn()" [sbuUnlessElse]="welcome"&gt;</code>.</p>
      </sbu-example>

      <sbu-example [n]="7" title="Strutturale con context tipizzato e trackBy" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="shuffle()">Inverti</button>
          <button type="button" class="btn" (click)="addUser()">Aggiungi</button>
          <button type="button" class="btn" (click)="removeFirst()">Rimuovi primo</button>
        </div>
        <ul class="mt-2 flex flex-col gap-1 text-sm">
          <li
            *sbuRepeat="let user of users(); trackBy: byId; index as i; first as isFirst; last as isLast"
            class="flex items-center gap-2"
          >
            <span class="w-24">{{ i }}. {{ user.name }}{{ isFirst ? ' (primo)' : '' }}{{ isLast ? ' (ultimo)' : '' }}</span>
            <input class="field" [attr.aria-label]="'Nota per ' + user.name" placeholder="scrivi qui…" />
          </li>
        </ul>
        <p note>
          Scrivi negli input e premi "Inverti": con <code>trackBy</code> le view vengono spostate, non ricreate, e il
          testo resta sulla riga giusta. <code>user</code> è tipizzato grazie a <code>ngTemplateContextGuard</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="Strutturale asincrona con cleanup" level="avanzato">
        <button type="button" class="btn" (click)="restartDelay()">Riavvia</button>
        @for (run of [delayRun()]; track run) {
          <p *sbuDelay="1500" class="mt-2">Comparso dopo 1.5s (run {{ run }})</p>
        }
        <p note>
          <code>track run</code> cambia a ogni click → la view viene distrutta e ricreata → la cleanup dell'effect
          cancella il vecchio timer.
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="Tabs: contentChildren + ViewContainerRef" level="avanzato">
        <sbu-tabs>
          <ng-template><p>Contenuto tab 1 — utenti: {{ names().join(', ') }}</p></ng-template>
          <ng-template><p>Contenuto tab 2 — creato solo quando selezionato</p></ng-template>
          <ng-template><p>Contenuto tab 3 — {{ loggedIn() ? 'loggato' : 'ospite' }}</p></ng-template>
        </sbu-tabs>
        <p note>
          <code>&lt;ng-content&gt;</code> non è un'ancora: serve <code>&lt;ng-container #outlet /&gt;</code> letto con
          <code>{{ '{' }} read: ViewContainerRef {{ '}' }}</code>, poi <code>clear()</code> +
          <code>createEmbeddedView(tpl)</code>.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class TemplatesPage {
  protected readonly users = signal<readonly User[]>([
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Linus' },
    { id: 3, name: 'Grace' },
  ]);
  protected readonly names = computed(() => this.users().map((u) => u.name));

  protected readonly loaded = signal(false);
  protected readonly selectedIndex = signal(0);
  protected readonly warning = signal(false);
  protected readonly loggedIn = signal(false);
  protected readonly delayRun = signal(1);

  protected readonly alertComponent = computed(() => (this.warning() ? WarningAlert : InfoAlert));
  protected readonly alertMessage = computed(() =>
    this.warning() ? 'Spazio quasi esaurito' : 'Backup completato',
  );

  protected readonly byId = (user: User) => user.id;

  private nextId = 4;

  protected selectNext(): void {
    this.selectedIndex.update((i) => (i + 1) % Math.max(1, this.users().length));
  }

  protected restartDelay(): void {
    this.delayRun.update((n) => n + 1);
  }

  protected shuffle(): void {
    this.users.update((list) => [...list].reverse());
  }

  protected addUser(): void {
    const id = this.nextId++;
    this.users.update((list) => [...list, { id, name: `User ${id}` }]);
  }

  protected removeFirst(): void {
    this.users.update((list) => list.slice(1));
  }
}
