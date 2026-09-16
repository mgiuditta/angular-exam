import { Directive, Signal, computed, forwardRef, inject, input } from '@angular/core';

/** Contratto pubblico dello scope (classe astratta = token + tipo). */
export abstract class Scope {
  abstract readonly name: Signal<string>;
  abstract readonly path: Signal<string>;
}

/**
 * ESEMPIO 8 — Provider su una DIRETTIVA + modificatori di risoluzione
 *
 *   <div sbuDiScope="esterno"> <section sbuDiScope="interno"> … </section> </div>
 *
 * - `providers` di una direttiva: registrati sul node injector dell'elemento che la ospita,
 *   visibili all'elemento e ai suoi discendenti (come quelli di un componente).
 * - `useExisting: ScopeDirective`: chi chiede `Scope` riceve l'istanza della direttiva stessa
 *   (espone un'API ridotta senza creare una seconda istanza).
 * - `forwardRef`: rimanda la lettura del riferimento. Indispensabile quando la classe è dichiarata
 *   PIÙ SOTTO nello stesso file (TDZ); nel decoratore della classe stessa è l'idioma classico
 *   (es. `{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MyInput), multi: true }`).
 * - `skipSelf`: la direttiva cerca lo Scope del GENITORE, saltando quello che fornisce lei stessa
 *   (senza skipSelf troverebbe se stessa → dipendenza circolare NG0200).
 */
@Directive({
  selector: '[sbuDiScope]',
  providers: [{ provide: Scope, useExisting: forwardRef(() => ScopeDirective) }],
})
export class ScopeDirective implements Scope {
  readonly name = input.required<string>({ alias: 'sbuDiScope' });

  private readonly parent = inject(Scope, { skipSelf: true, optional: true });

  readonly path = computed(() => {
    const parentPath = this.parent?.path();
    return parentPath ? `${parentPath} › ${this.name()}` : this.name();
  });
}
