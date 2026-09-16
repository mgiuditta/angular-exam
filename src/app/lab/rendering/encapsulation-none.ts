import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * ViewEncapsulation.None: gli stili vengono inseriti nel <head> così come sono → diventano GLOBALI.
 * `.sbu-enc-text` sottolinea OGNI elemento con quella classe nel documento (fuori dallo shadow DOM),
 * finché esiste almeno un'istanza: alla distruzione dell'ultima lo <style> viene rimosso.
 * `:host` qui non ha senso (nessun attributo host): si usa il selettore del tag.
 */
@Component({
  selector: 'sbu-encapsulation-none',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    sbu-encapsulation-none {
      display: block;
      border: 2px solid var(--warning);
      border-radius: var(--radius);
      padding: 0.5rem;
    }
    .sbu-enc-text {
      text-decoration: underline wavy var(--warning);
    }
  `,
  template: `<p class="sbu-enc-text text-sm">None: la mia sottolineatura esce dal componente</p>`,
})
export class EncapsulationNone {}
