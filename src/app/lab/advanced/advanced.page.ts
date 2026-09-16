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
import { Example, LabPage } from '../shared/example';
import { ConfirmDialog } from './confirm-dialog';
import { HeavyReport } from './heavy-report';
import { CURRENT_ROLE, RequireRole, Role } from './require-role';
import { Tab, Tabs } from './tabs';

/**
 * Pagina: PATTERN AVANZATI
 * Combina i mattoni delle pagine precedenti come nelle librerie reali.
 */
@Component({
  selector: 'sbu-advanced-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, Tabs, Tab, RequireRole, HeavyReport],
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
        <p note>
          Tab attivo (two-way con model): {{ activeTab() }}. Il testo scritto in "Profilo" si perde cambiando tab: la view
          viene distrutta. Usa frecce/Home/End sulla tablist.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="createComponent con inputBinding / outputBinding" level="avanzato">
        <button type="button" class="btn" (click)="openDialog()">Elimina progetto…</button>
        <p class="mt-2 text-sm" role="status">Ultima risposta: {{ answer() }}</p>
        <ng-container #dialogHost />
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
