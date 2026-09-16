import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewContainerRef,
  contentChildren,
  effect,
  signal,
  viewChild,
} from '@angular/core';

/**
 * ESEMPIO 9 — Tabs: template proiettati renderizzati a mano con ViewContainerRef
 *
 * Uso: <sbu-tabs><ng-template>A</ng-template><ng-template>B</ng-template></sbu-tabs>
 *
 * Errori tipici:
 * - `<ng-content #x>` NON è un punto di inserimento: <ng-content> sposta nodi già creati,
 *   e i <ng-template> proiettati non renderizzano niente da soli.
 * - serve un ANCORA: `<ng-container #outlet />` letto con `{ read: ViewContainerRef }`
 *   (senza `read` la query restituisce ElementRef).
 * - `vcr.createEmbeddedView(tpl)` crea la view; `vcr.clear()` distrugge le precedenti.
 *
 * Lifecycle: `outlet` è undefined finché la view non esiste → guard nell'effect,
 * che si ri-esegue da solo quando il signal della query si risolve.
 */
@Component({
  selector: 'sbu-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="tablist" class="flex gap-2">
      @for (tpl of templates(); track $index) {
        <button
          type="button"
          role="tab"
          class="btn"
          [attr.aria-selected]="$index === active()"
          (click)="active.set($index)"
        >
          Tab {{ $index + 1 }}
        </button>
      }
    </div>
    <div role="tabpanel" class="mt-2 text-sm">
      <ng-container #outlet />
    </div>
  `,
})
export class Tabs {
  protected readonly templates = contentChildren(TemplateRef);
  private readonly outlet = viewChild('outlet', { read: ViewContainerRef });
  protected readonly active = signal(0);

  constructor() {
    effect(() => {
      const vcr = this.outlet();
      const tpl = this.templates()[this.active()];
      if (!vcr) return;
      vcr.clear();
      if (tpl) vcr.createEmbeddedView(tpl);
    });
  }
}
