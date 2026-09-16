import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ScopeProbe } from './scope-probe';

/**
 * ESEMPIO 8 — Un componente qualunque che contiene una probe nel SUO template.
 * Per quella probe l'host è `<sbu-di-scope-boundary>`: con `host: true` la ricerca non esce di qui,
 * quindi non vede lo Scope dichiarato fuori, nel template della pagina.
 */
@Component({
  selector: 'sbu-di-scope-boundary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScopeProbe],
  host: { class: 'block' },
  template: `<sbu-di-scope-probe label="Probe nel template di un componente figlio" />`,
})
export class ScopeBoundary {}
