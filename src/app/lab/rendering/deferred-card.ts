import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let created = 0;

/**
 * Usato SOLO dentro blocchi @defer → finisce in un chunk lazy separato.
 * Tutti i blocchi della pagina condividono questo chunk: scaricato una volta, gli altri blocchi
 * non devono più aspettare la rete, ma aspettano comunque il PROPRIO trigger.
 */
@Component({
  selector: 'sbu-deferred-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p class="rounded-md border border-success bg-card p-2 text-sm">
      ✅ Caricato con <code>{{ trigger() }}</code> (istanza #{{ instance }})
    </p>
  `,
})
export class DeferredCard {
  readonly trigger = input.required<string>();
  // Il constructor gira solo quando il blocco passa allo stato "complete".
  protected readonly instance = ++created;
}
