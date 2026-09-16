import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

/**
 * ESEMPIO 6 — Direttiva strutturale base (il contrario di @if)
 *
 *   <p *sbuUnless="loggedIn(); else welcome">Effettua il login</p>
 *   <ng-template #welcome><p>Bentornato</p></ng-template>
 *
 * Desugaring dell'asterisco (domanda d'esame):
 *   <ng-template [sbuUnless]="loggedIn()" [sbuUnlessElse]="welcome">
 *     <p>Effettua il login</p>
 *   </ng-template>
 * → la direttiva sta sull'<ng-template>, quindi può iniettare:
 *   - TemplateRef       = il "progetto" del contenuto (non ancora renderizzato)
 *   - ViewContainerRef  = il punto (un commento <!--container-->) dove inserire le view
 * Microsyntax: `; else x` → input `sbuUnlessElse` (prefisso selettore + chiave capitalizzata).
 *
 * Lifecycle:
 * - `createEmbeddedView` crea una EMBEDDED VIEW: componenti/direttive al suo interno nascono ORA
 *   (constructor, ngOnInit, ...).
 * - `vcr.clear()` distrugge le view → ngOnDestroy/DestroyRef di tutto il contenuto.
 * - l'effect gira durante il change detection, prima del render della view che contiene l'host.
 */
@Directive({ selector: '[sbuUnless]' })
export class Unless {
  readonly condition = input.required<boolean>({ alias: 'sbuUnless' });
  readonly elseTemplate = input<TemplateRef<unknown> | null>(null, { alias: 'sbuUnlessElse' });

  private readonly template = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const next = this.condition() ? this.elseTemplate() : this.template;
      // ponytail: ricrea sempre; @if interno invece riusa la view se il ramo non cambia
      this.vcr.clear();
      if (next) this.vcr.createEmbeddedView(next);
    });
  }
}
