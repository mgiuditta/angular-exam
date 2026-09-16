import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * ESEMPIO 4 — Output + listener globali (document/window)
 *
 * Cosa fa: emette `clickOutside` quando si clicca fuori dall'host (es. chiudere un menu).
 *   <div sbuClickOutside (clickOutside)="open.set(false)">...</div>
 *
 * Concetti:
 * - `'(document:click)'` / `'(window:resize)'` registrano il listener su un target globale.
 *   Anche questi vengono rimossi automaticamente alla distruzione della direttiva.
 *   → Con addEventListener manuale DOVRESTI rimuoverli tu (DestroyRef), vedi Tooltip.
 * - `output()` restituisce un OutputEmitterRef: `.emit()`; non è un Observable
 *   (per RxJS: `outputToObservable` / `outputFromObservable`).
 * - i metodi usati nei binding `host` devono essere accessibili dal template (public/protected).
 */
@Directive({
  selector: '[sbuClickOutside]',
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class ClickOutside {
  readonly clickOutside = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.clickOutside.emit();
    }
  }
}
