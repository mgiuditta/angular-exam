import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
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

const CODE = {
  ngContainer: ts`
    <dl>
      @for (user of users(); track user.id) {
        <ng-container>  <!-- nel DOM diventa un commento: dt/dd restano figli diretti di <dl> -->
          <dt>#{{ user.id }}</dt>
          <dd>{{ user.name }}</dd>
        </ng-container>
      }
    </dl>

    <ng-container ngProjectAs="[note]">
      <p>Proiettato nello slot [note]</p>
    </ng-container>
  `,
  templateOutlet: ts`
    <ng-template #spinner>
      <span role="status">⏳ Caricamento…</span>
    </ng-template>

    @if (loaded()) {
      <span>Sezione A pronta</span>
    } @else {
      <ng-container [ngTemplateOutlet]="spinner" />  <!-- forma a binding -->
    }

    @if (loaded()) {
      <span>Sezione B pronta</span>
    } @else {
      <ng-container *ngTemplateOutlet="spinner" />   <!-- forma strutturale -->
    }
  `,
  outletContext: ts`
    <ng-template #row let-user let-position="position" let-total="total">
      <li>{{ position }}/{{ total }} — {{ user.name }}</li>
    </ng-template>

    <ul>
      @for (user of users(); track user.id; let i = $index) {
        <ng-container
          *ngTemplateOutlet="row; context: { $implicit: user, position: i + 1, total: users().length }"
        />
      }
    </ul>
  `,
  cardList: ts`
    export class CardList<T> {
      readonly items = input.required<readonly T[]>();
      readonly itemTemplate = input<TemplateRef<ItemContext<T>>>();
      private readonly projected = contentChild<TemplateRef<ItemContext<T>>>(TemplateRef);
      protected readonly template = computed(() => this.itemTemplate() ?? this.projected());
    }

    <!-- template di CardList -->
    @for (item of items(); track $index) {
      <ng-container
        [ngTemplateOutlet]="template() ?? defaultTemplate"
        [ngTemplateOutletContext]="{ $implicit: item, index: $index }"
      />
    }
    <ng-template #defaultTemplate let-item let-i="index">{{ i + 1 }}. {{ item }}</ng-template>

    <!-- A) template via input -->
    <sbu-card-list [items]="names()" [itemTemplate]="badge" />
    <ng-template #badge let-name><span>{{ name }}</span></ng-template>

    <!-- B) template proiettato -->
    <sbu-card-list [items]="names()">
      <ng-template let-name let-i="index">
        <strong>{{ name }}</strong> {{ i === selectedIndex() ? '← selezionato' : '' }}
      </ng-template>
    </sbu-card-list>
  `,
  componentOutlet: ts`
    alertComponent = computed(() => (this.warning() ? WarningAlert : InfoAlert));
    alertMessage = computed(() => (this.warning() ? 'Spazio quasi esaurito' : 'Backup completato'));

    <ng-container *ngComponentOutlet="alertComponent(); inputs: { message: alertMessage() }" />

    @Component({
      selector: 'sbu-info-alert',
      template: \`<p role="status">ℹ️ {{ message() }}</p>\`,
    })
    export class InfoAlert {
      readonly message = input.required<string>(); // stessa API di WarningAlert
    }
  `,
  unless: ts`
    <p *sbuUnless="loggedIn(); else welcome">Effettua il login per continuare.</p>
    <ng-template #welcome><p>Bentornato 👋</p></ng-template>

    @Directive({ selector: '[sbuUnless]' })
    export class Unless {
      readonly condition = input.required<boolean>({ alias: 'sbuUnless' });
      readonly elseTemplate = input<TemplateRef<unknown> | null>(null, { alias: 'sbuUnlessElse' }); // "; else x"

      private readonly template = inject(TemplateRef);
      private readonly vcr = inject(ViewContainerRef);

      constructor() {
        effect(() => {
          const next = this.condition() ? this.elseTemplate() : this.template;
          this.vcr.clear();
          if (next) this.vcr.createEmbeddedView(next);
        });
      }
    }
  `,
  repeat: ts`
    <li *sbuRepeat="let user of users(); trackBy: byId; index as i; first as isFirst; last as isLast">
      {{ i }}. {{ user.name }}
    </li>

    byId = (user: User) => user.id;

    export interface RepeatContext<T> {
      $implicit: T;  // let user
      index: number; // index as i
      count: number;
      first: boolean;
      last: boolean;
    }

    @Directive({ selector: '[sbuRepeat]' })
    export class Repeat<T> {
      readonly items = input.required<readonly T[]>({ alias: 'sbuRepeatOf' }); // of users()
      readonly trackBy = input<(item: T) => unknown>((item) => item, { alias: 'sbuRepeatTrackBy' }); // trackBy: byId

      private readonly template = inject<TemplateRef<RepeatContext<T>>>(TemplateRef);
      private readonly vcr = inject(ViewContainerRef);
      private views = new Map<unknown, EmbeddedViewRef<RepeatContext<T>>>();

      constructor() {
        effect(() => {
          const items = this.items();
          const trackBy = this.trackBy();
          const next = new Map<unknown, EmbeddedViewRef<RepeatContext<T>>>();

          items.forEach((item, index) => {
            const context: RepeatContext<T> = {
              $implicit: item,
              index,
              count: items.length,
              first: index === 0,
              last: index === items.length - 1,
            };
            const key = trackBy(item);
            const reused = this.views.get(key);
            if (reused) {
              this.views.delete(key);
              Object.assign(reused.context, context);
              this.vcr.move(reused, index); // spostata, non ricreata: lo stato DOM sopravvive
              next.set(key, reused);
            } else {
              next.set(key, this.vcr.createEmbeddedView(this.template, context, index));
            }
          });

          this.views.forEach((view) => view.destroy()); // chiavi sparite
          this.views = next;
        });
      }

      // user tipizzato come T invece di any
      static ngTemplateContextGuard<T>(_dir: Repeat<T>, _ctx: unknown): _ctx is RepeatContext<T> {
        return true;
      }
    }
  `,
  delay: ts`
    @for (run of [delayRun()]; track run) {
      <p *sbuDelay="1500">Comparso dopo 1.5s (run {{ run }})</p>
    }

    @Directive({ selector: '[sbuDelay]' })
    export class Delay {
      readonly ms = input.required({ alias: 'sbuDelay', transform: numberAttribute });
      private readonly template = inject(TemplateRef);
      private readonly vcr = inject(ViewContainerRef);

      constructor() {
        effect((onCleanup) => {
          const id = setTimeout(() => this.vcr.createEmbeddedView(this.template), this.ms());
          onCleanup(() => {
            // input cambiato o direttiva distrutta
            clearTimeout(id);
            this.vcr.clear();
          });
        });
      }
    }
  `,
  tabs: ts`
    <sbu-tabs>
      <ng-template><p>Contenuto tab 1</p></ng-template>
      <ng-template><p>Contenuto tab 2 — creato solo quando selezionato</p></ng-template>
    </sbu-tabs>

    @Component({
      selector: 'sbu-tabs',
      template: \`
        <div role="tablist">
          @for (tpl of templates(); track $index) {
            <button type="button" role="tab" [attr.aria-selected]="$index === active()" (click)="active.set($index)">
              Tab {{ $index + 1 }}
            </button>
          }
        </div>
        <div role="tabpanel"><ng-container #outlet /></div>
      \`,
    })
    export class Tabs {
      protected readonly templates = contentChildren(TemplateRef);
      private readonly outlet = viewChild('outlet', { read: ViewContainerRef }); // senza read → ElementRef
      protected readonly active = signal(0);

      constructor() {
        effect(() => {
          const vcr = this.outlet();
          const tpl = this.templates()[this.active()];
          if (!vcr) return;
          vcr.clear();
          if (tpl) vcr.createEmbeddedView(tpl);
        });
      }
    }
  `,
};

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
  imports: [Example, LabPage, CodeBlock, NgTemplateOutlet, NgComponentOutlet, CardList, Unless, Repeat, Delay, Tabs],
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
        <sbu-code [code]="code.ngContainer" />
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
        <sbu-code [code]="code.templateOutlet" />
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
        <sbu-code [code]="code.outletContext" />
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
        <sbu-code [code]="code.cardList" />
        <p note>Il template è valutato nel contesto del padre (<code>selectedIndex()</code>) ma inserito nel figlio.</p>
      </sbu-example>

      <sbu-example [n]="5" title="ngComponentOutlet: componente scelto a runtime" level="intermedio">
        <button type="button" class="btn" (click)="warning.set(!warning())">Cambia tipo</button>
        <div class="mt-2">
          <ng-container *ngComponentOutlet="alertComponent(); inputs: { message: alertMessage() }" />
        </div>
        <sbu-code [code]="code.componentOutlet" />
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
        <sbu-code [code]="code.unless" />
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
        <sbu-code [code]="code.repeat" />
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
        <sbu-code [code]="code.delay" />
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
        <sbu-code [code]="code.tabs" />
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
  protected readonly code = CODE;

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
