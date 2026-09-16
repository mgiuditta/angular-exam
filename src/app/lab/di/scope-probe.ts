import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Scope } from './scope';

/**
 * ESEMPIO 8 — Stesso token, quattro modi di cercarlo (tutti `optional` per mostrare null
 * invece di lanciare NullInjectorError):
 * - default:   parte dal nodo corrente e risale element injector → environment injector.
 * - self:      SOLO il nodo corrente (direttive/providers sullo stesso elemento).
 * - skipSelf:  parte dal nodo PADRE.
 * - host:      risale ma si ferma all'elemento host del componente nel cui template il nodo è
 *              dichiarato (non esce dalla view che lo contiene).
 */
@Component({
  selector: 'sbu-di-scope-probe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <table class="w-full text-left text-sm">
      <caption class="mb-1 text-left font-medium">{{ label() }}</caption>
      <tbody>
        @for (lookup of lookups; track lookup.call) {
          <tr class="border-b border-border">
            <th scope="row" class="py-1 pr-2 font-normal"><code>{{ lookup.call }}</code></th>
            <td class="py-1">
              @if (lookup.scope; as scope) {
                {{ scope.path() }}
              } @else {
                <code>null</code>
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class ScopeProbe {
  readonly label = input.required<string>();

  protected readonly lookups = [
    { call: 'inject(Scope)', scope: inject(Scope, { optional: true }) },
    { call: 'self', scope: inject(Scope, { self: true, optional: true }) },
    { call: 'skipSelf', scope: inject(Scope, { skipSelf: true, optional: true }) },
    { call: 'host', scope: inject(Scope, { host: true, optional: true }) },
  ];
}
