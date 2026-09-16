import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * ESEMPIO 8 — Strutturale asincrona + cleanup
 *
 *   <p *sbuDelay="1500">Compaio dopo 1.5s</p>
 *
 * Concetti:
 * - `numberAttribute` come transform: accetta anche `sbuDelay="1500"` (stringa).
 * - `effect(onCleanup)`: la cleanup gira quando l'effect si RI-esegue (input cambiato) o quando
 *   la direttiva viene distrutta → il timer non crea view su un host morto.
 * - zoneless: inserire una view in un ViewContainerRef notifica lo scheduler → render automatico,
 *   anche se avviene dentro un setTimeout.
 * - è la stessa idea di `@defer (on timer(1500ms))`, che però fa anche lazy loading del codice.
 */
@Directive({ selector: '[sbuDelay]' })
export class Delay {
  readonly ms = input.required({ alias: 'sbuDelay', transform: numberAttribute });

  private readonly template = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    effect((onCleanup) => {
      const id = setTimeout(() => this.vcr.createEmbeddedView(this.template), this.ms());
      onCleanup(() => {
        clearTimeout(id);
        this.vcr.clear();
      });
    });
  }
}
