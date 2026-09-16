import { Directive, input } from '@angular/core';

const DEFAULT_COLOR = '#fef08a';

/**
 * ESEMPIO 1 — Direttiva di attributo (base)
 *
 * Cosa fa: colora lo sfondo dell'elemento host.
 *   <p sbuHighlight>            → colore di default
 *   <p sbuHighlight="#bbf7d0">  → colore passato come valore dell'attributo
 *   <p [sbuHighlight]="c()">    → colore da binding
 *
 * Concetti:
 * - `alias: 'sbuHighlight'`: input con lo stesso nome del selettore → `sbuHighlight="..."` è sia
 *   il match della direttiva sia il valore dell'input.
 * - `transform`: `<p sbuHighlight>` passa stringa vuota '' → la trasformiamo nel default.
 * - `host: {...}` sostituisce @HostBinding/@HostListener (vietati nelle linee guida moderne).
 * - `exportAs`: `#h="sbuHighlight"` nel template dà accesso all'istanza (h.color()).
 *
 * Lifecycle:
 * - constructor → DI disponibile, input NON ancora impostati (un input() vale il default,
 *   un input.required() lancia NG0950 se letto qui).
 * - primo change detection del PADRE → Angular scrive gli input → ngOnChanges → ngOnInit.
 * - i binding `host` vengono valutati durante il CD della view del padre
 *   (l'elemento host appartiene al template del padre, non alla direttiva).
 */
@Directive({
  selector: '[sbuHighlight]',
  exportAs: 'sbuHighlight',
  host: {
    '[style.backgroundColor]': 'color()',
    // testo scuro fisso: contrasto AA garantito anche in dark mode
    '[style.color]': '"#111827"',
  },
})
export class Highlight {
  readonly color = input(DEFAULT_COLOR, {
    alias: 'sbuHighlight',
    transform: (value: string | undefined) => value || DEFAULT_COLOR,
  });
}
