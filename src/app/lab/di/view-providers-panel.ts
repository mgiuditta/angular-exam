import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FROM_PROVIDERS, FROM_VIEW_PROVIDERS } from './panel-tokens';
import { TokenReader } from './token-reader';

/**
 * ESEMPIO 7 — providers vs viewProviders
 *
 * - `providers`: visibili al componente, alla sua VIEW (template) e al contenuto PROIETTATO.
 * - `viewProviders`: visibili al componente e alla sua VIEW, NON al contenuto proiettato.
 *   Il contenuto proiettato è dichiarato nella view del PADRE: risale gli injector da dove è
 *   scritto nel template del padre, e sul nodo del pannello trova solo i `providers`.
 * Uso tipico di viewProviders: servizi interni di una libreria che il contenuto dell'utente
 * non deve poter iniettare.
 */
@Component({
  selector: 'sbu-di-view-providers-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TokenReader],
  providers: [{ provide: FROM_PROVIDERS, useValue: 'dal pannello' }],
  viewProviders: [{ provide: FROM_VIEW_PROVIDERS, useValue: 'dal pannello' }],
  host: { class: 'block' },
  template: `
    <div class="grid gap-2 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
      <sbu-di-token-reader label="Nel template del pannello (view)" />
      <ng-content />
    </div>
  `,
})
export class ViewProvidersPanel {}
