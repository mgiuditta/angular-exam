import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HoverClass } from './hover-class';
import { Tooltip } from './tooltip';
import { ClickOutside } from './click-outside';

/**
 * ESEMPIO 6 — Composition API: hostDirectives
 *
 * Cosa fa: un bottone che "eredita" HoverClass e Tooltip senza che chi lo usa debba
 * scrivere gli attributi delle direttive.
 *   <button sbuFancy tooltip="Ciao" hoverClass="ring-2 ring-info">Fancy</button>
 *
 * Concetti:
 * - selettore `button[sbuFancy]`: componente su elemento nativo → mantiene semantica,
 *   focus e tastiera del <button> (meglio di un <sbu-button> che wrappa un button).
 * - `hostDirectives`: le direttive vengono applicate SEMPRE (il loro selettore è ignorato).
 * - input/output delle host directive NON sono esposti di default: vanno elencati,
 *   eventualmente rinominati con 'nomeOriginale: alias'.
 * - la host directive è iniettabile nell'host: stessa istanza (`inject(HoverClass)`).
 *
 * Lifecycle (domanda d'esame):
 * - le host directive vengono istanziate PRIMA del componente host,
 *   e i loro hook (ngOnInit, ecc.) girano prima di quelli dell'host.
 */
@Component({
  selector: 'button[sbuFancy]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    { directive: HoverClass, inputs: ['sbuHoverClass: hoverClass'] },
    { directive: Tooltip, inputs: ['sbuTooltip: tooltip'] },
    { directive: ClickOutside },
  ],
  host: {
    type: 'button',
    class: 'btn',
    '[attr.data-hovered]': 'hover.hovered()',
  },
  template: `<ng-content />{{ hover.hovered() ? ' ✨' : '' }}`,
})
export class FancyButton {
  protected readonly hover = inject(HoverClass);
}
