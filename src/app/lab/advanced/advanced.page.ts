import {
  ChangeDetectionStrategy,
  Component,
  ViewContainerRef,
  inject,
  inputBinding,
  outputBinding,
  signal,
  viewChild,
} from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { ConfirmDialog } from './confirm-dialog';
import { HeavyReport } from './heavy-report';
import { CURRENT_ROLE, RequireRole, Role } from './require-role';
import { Tab, Tabs } from './tabs';

const CODE = {
  tabs: ts`
    <sbu-tabs label="Impostazioni account" [(active)]="activeTab">
      <ng-template sbuTab="Profilo">…</ng-template>
      <ng-template sbuTab="Sicurezza">…</ng-template>
    </sbu-tabs>

    @Directive({ selector: 'ng-template[sbuTab]' }) // solo su ng-template → TemplateRef sempre presente
    export class Tab {
      readonly label = input.required<string>({ alias: 'sbuTab' });
      readonly template = inject(TemplateRef);
    }

    export class Tabs {
      readonly label = input.required<string>();
      readonly active = model(0); // [(active)]
      protected readonly tabs = contentChildren(Tab);
      protected readonly current = computed(() => this.tabs()[this.active()]);
    }

    <!-- template di Tabs -->
    @for (tab of tabs(); track tab; let i = $index) {
      <button type="button" role="tab" [attr.aria-selected]="i === active()"
              [tabIndex]="i === active() ? 0 : -1" (click)="active.set(i)">
        {{ tab.label() }}
      </button>
    }
    @if (current(); as tab) {
      <div role="tabpanel" tabindex="0">
        <ng-container [ngTemplateOutlet]="tab.template" />  <!-- cambio tab = view distrutta -->
      </div>
    }
  `,
  createComponent: ts`
    <button type="button" class="btn" (click)="openDialog()">Elimina progetto…</button>
    <ng-container #dialogHost />

    private readonly dialogHost = viewChild.required('dialogHost', { read: ViewContainerRef });

    openDialog(): void {
      this.dialogHost().clear();
      const ref = this.dialogHost().createComponent(ConfirmDialog, {
        bindings: [
          inputBinding('title', () => \`Eliminare il progetto? (ruolo: \${this.role()})\`), // reattivo
          outputBinding<boolean>('closed', (confirmed) => {
            this.answer.set(confirmed ? 'confermato' : 'annullato');
            ref.destroy();
          }),
        ],
      });
    }

    // ConfirmDialog: <dialog> nativo → focus trap, Esc e backdrop li gestisce il browser
    constructor() {
      afterNextRender(() => this.dialog().nativeElement.showModal?.());
    }
  `,
  requireRole: ts`
    export const CURRENT_ROLE = new InjectionToken<WritableSignal<Role>>('CURRENT_ROLE');

    // AdvancedPage
    providers: [{ provide: CURRENT_ROLE, useFactory: () => signal<Role>('guest') }],

    @Directive({ selector: '[sbuRequireRole]' })
    export class RequireRole {
      readonly required = input.required<Role>({ alias: 'sbuRequireRole' });
      private readonly role = inject(CURRENT_ROLE);
      private readonly allowed = computed(() => RANK[this.role()] >= RANK[this.required()]);

      constructor() {
        const template = inject(TemplateRef, { optional: true }); // presente solo con *

        if (template) {
          const vcr = inject(ViewContainerRef);
          effect(() => {
            vcr.clear();
            if (this.allowed()) vcr.createEmbeddedView(template);
          });
          return;
        }

        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        const renderer = inject(Renderer2);
        effect(() =>
          this.allowed()
            ? renderer.removeAttribute(host, 'disabled')
            : renderer.setAttribute(host, 'disabled', ''),
        );
      }
    }

    <button type="button" sbuRequireRole="admin">Elimina (admin)</button>
    <span *sbuRequireRole="'admin'">🔐 Pannello admin visibile</span>
  `,
  letDefer: ts`
    @let current = role();
    @let canSeeReport = current !== 'guest';
    <p>Ruolo: {{ current }} — report {{ canSeeReport ? 'consentito' : 'negato' }}</p>

    @if (canSeeReport) {
      @defer (on interaction; prefetch on idle) {
        <sbu-heavy-report />  <!-- chunk separato: HeavyReport è usato solo qui -->
      } @placeholder {
        <button type="button" class="btn">Carica report</button>
      } @loading (after 100ms; minimum 300ms) {
        <p role="status">Caricamento…</p>
      }
    }
  `,
};

/**
 * Pagina: PATTERN AVANZATI
 * Combina i mattoni delle pagine precedenti come nelle librerie reali.
 */
@Component({
  selector: 'sbu-advanced-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock, Tabs, Tab, RequireRole, HeavyReport],
  // Provider a livello di componente: un'istanza per ogni AdvancedPage, visibile a tutto il suo
  // template (e al componente stesso). Distrutta insieme alla pagina.
  providers: [{ provide: CURRENT_ROLE, useFactory: () => signal<Role>('guest') }],
  template: `
    <sbu-lab-page heading="Pattern avanzati">
      <span intro>Tabs con template, creazione dinamica, direttive duali, &#64;let e &#64;defer.</span>

      <sbu-example [n]="1" title="Tabs: contentChildren + ng-template + outlet" level="intermedio">
        <sbu-tabs label="Impostazioni account" [(active)]="activeTab">
          <ng-template sbuTab="Profilo">
            <label class="flex flex-col gap-1 text-sm">
              Nome visualizzato
              <input class="field" placeholder="scrivi, poi cambia tab" />
            </label>
          </ng-template>
          <ng-template sbuTab="Sicurezza">
            <p class="text-sm">2FA attiva.</p>
          </ng-template>
          <ng-template sbuTab="Notifiche">
            <p class="text-sm">Email settimanale.</p>
          </ng-template>
        </sbu-tabs>
        <sbu-code [code]="code.tabs" />
        <p note>
          Tab attivo (two-way con model): {{ activeTab() }}. Il testo scritto in "Profilo" si perde cambiando tab: la view
          viene distrutta. Usa frecce/Home/End sulla tablist.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="createComponent con inputBinding / outputBinding" level="avanzato">
        <button type="button" class="btn" (click)="openDialog()">Elimina progetto…</button>
        <p class="mt-2 text-sm" role="status">Ultima risposta: {{ answer() }}</p>
        <ng-container #dialogHost />
        <sbu-code [code]="code.createComponent" />
        <p note>
          <code>ViewContainerRef.createComponent</code> crea il componente accanto a <code>#dialogHost</code>.
          <code>inputBinding</code> collega un signal all'input (reattivo), <code>outputBinding</code> si iscrive all'output.
          <code>ref.destroy()</code> esegue ngOnDestroy e rimuove il DOM.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="Direttiva duale: attributo o strutturale" level="avanzato">
        <fieldset class="flex flex-wrap gap-3 text-sm">
          <legend class="mb-1 font-medium">Ruolo corrente</legend>
          @for (r of roles; track r) {
            <label class="flex items-center gap-1">
              <input type="radio" name="role" [value]="r" [checked]="role() === r" (change)="role.set(r)" />
              {{ r }}
            </label>
          }
        </fieldset>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" class="btn" sbuRequireRole="editor">Modifica (editor)</button>
          <button type="button" class="btn" sbuRequireRole="admin">Elimina (admin)</button>
          <span *sbuRequireRole="'admin'" class="text-sm">🔐 Pannello admin visibile</span>
        </div>
        <sbu-code [code]="code.requireRole" />
        <p note>
          Stessa direttiva: sui bottoni imposta <code>disabled</code>, con <code>*</code> crea/distrugge la view.
          Il ruolo arriva da un <code>InjectionToken</code> fornito nei <code>providers</code> della pagina.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="@let e @defer: variabili di template e lazy loading" level="avanzato">
        @let current = role();
        @let canSeeReport = current !== 'guest';
        <p class="text-sm">Ruolo: {{ current }} — report {{ canSeeReport ? 'consentito' : 'negato' }}</p>

        @if (canSeeReport) {
          @defer (on interaction; prefetch on idle) {
            <sbu-heavy-report />
          } @placeholder {
            <button type="button" class="btn mt-2">Carica report</button>
          } @loading (after 100ms; minimum 300ms) {
            <p class="mt-2 text-sm" role="status">Caricamento…</p>
          }
        }
        <sbu-code [code]="code.letDefer" />
        <p note>
          <code>&#64;let</code> è read-only e visibile solo nel blocco in cui è dichiarato. <code>&#64;defer</code>: il
          contenuto (e il suo codice) nasce solo al trigger; qui l'interazione col placeholder.
          <code>prefetch on idle</code> scarica il chunk prima, senza istanziare.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class AdvancedPage {
  protected readonly code = CODE;

  protected readonly role = inject(CURRENT_ROLE);
  protected readonly roles: readonly Role[] = ['guest', 'editor', 'admin'];
  protected readonly activeTab = signal(0);
  protected readonly answer = signal('—');

  private readonly dialogHost = viewChild.required('dialogHost', { read: ViewContainerRef });

  protected openDialog(): void {
    this.dialogHost().clear();
    const ref = this.dialogHost().createComponent(ConfirmDialog, {
      bindings: [
        // inputBinding riceve una funzione/signal letta in contesto reattivo: se role() cambia, l'input si aggiorna.
        inputBinding('title', () => `Eliminare il progetto? (ruolo: ${this.role()})`),
        outputBinding<boolean>('closed', (confirmed) => {
          this.answer.set(confirmed ? 'confermato' : 'annullato');
          // Distrugge la view: ngOnDestroy, DestroyRef, subscription degli output chiuse.
          ref.destroy();
        }),
      ],
    });
  }
}
