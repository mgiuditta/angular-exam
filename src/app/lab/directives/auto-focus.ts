import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * ESEMPIO 3 — Accesso al DOM nel momento giusto del lifecycle
 *
 * Cosa fa: mette il focus sull'host appena è visibile.
 *   @if (editing()) { <input sbuAutoFocus /> }
 *
 * Perché NON nel constructor / ngOnInit:
 * - l'elemento esiste già (lo crea il template del padre prima di istanziare la direttiva),
 *   ma la view può non essere ancora attaccata al document → focus() fallisce in silenzio.
 *
 * Perché `afterNextRender` e non `ngAfterViewInit`:
 * - ngAfterViewInit = "la view di QUESTO componente è inizializzata" (per una direttiva è
 *   poco significativo e gira anche lato server).
 * - afterNextRender = callback eseguita UNA volta dopo che Angular ha scritto il DOM del browser.
 *   Non gira in SSR → sicuro per API solo-browser (focus, misure, librerie terze).
 * - va chiamato in injection context (constructor o field initializer).
 * - variante `afterEveryRender` = dopo OGNI render (attenzione alle performance).
 */
@Directive({ selector: '[sbuAutoFocus]' })
export class AutoFocus {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.host.nativeElement.focus());
  }
}
