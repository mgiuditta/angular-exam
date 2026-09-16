import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
  model,
  viewChildren,
} from '@angular/core';

let nextId = 0;

/**
 * Marca un <ng-template> come tab. Selettore `ng-template[sbuTab]`: si applica SOLO a ng-template,
 * quindi TemplateRef è sempre iniettabile (niente optional).
 *
 *   <ng-template sbuTab="Profilo">…</ng-template>
 */
@Directive({ selector: 'ng-template[sbuTab]' })
export class Tab {
  readonly label = input.required<string>({ alias: 'sbuTab' });
  readonly template = inject(TemplateRef);
}

/**
 * ESEMPIO 1 — Tabs: contentChildren + ng-template + ngTemplateOutlet + model()
 *
 *   <sbu-tabs label="Impostazioni" [(active)]="tab">
 *     <ng-template sbuTab="Profilo">…</ng-template>
 *     <ng-template sbuTab="Sicurezza">…</ng-template>
 *   </sbu-tabs>
 *
 * Concetti:
 * - `contentChildren(Tab)`: signal con le direttive trovate nel contenuto proiettato
 *   (solo figli diretti di default; `descendants: true` per cercare più in profondità).
 * - i tab sono template → solo il pannello attivo esiste. Cambiare tab DISTRUGGE la view
 *   precedente (stato dei form perso, ngOnDestroy dei componenti dentro).
 *   Per "keep alive" bisogna creare le view una volta sola e staccarle/riattaccarle con
 *   ViewContainerRef.detach/insert.
 * - `model()`: input + output `activeChange` → supporta `[(active)]`.
 * - a11y (WAI-ARIA tabs): role tablist/tab/tabpanel, aria-selected, roving tabindex, frecce.
 */
@Component({
  selector: 'sbu-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: { class: 'block' },
  template: `
    <div role="tablist" [attr.aria-label]="label()" class="flex gap-1 border-b border-border" (keydown)="onKeydown($event)">
      @for (tab of tabs(); track tab; let i = $index) {
        <button
          #tabButton
          type="button"
          role="tab"
          [id]="id + '-tab-' + i"
          [attr.aria-selected]="i === active()"
          [attr.aria-controls]="id + '-panel'"
          [tabIndex]="i === active() ? 0 : -1"
          [class]="i === active() ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground'"
          class="-mb-px px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          (click)="active.set(i)"
        >
          {{ tab.label() }}
        </button>
      }
    </div>
    @if (current(); as tab) {
      <div role="tabpanel" [id]="id + '-panel'" [attr.aria-labelledby]="id + '-tab-' + active()" tabindex="0" class="p-3">
        <ng-container [ngTemplateOutlet]="tab.template" />
      </div>
    }
  `,
})
export class Tabs {
  readonly label = input.required<string>();
  readonly active = model(0);

  protected readonly id = `tabs-${nextId++}`;
  protected readonly tabs = contentChildren(Tab);
  protected readonly current = computed(() => this.tabs()[this.active()]);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.tabs().length;
    const moves: Record<string, number> = {
      ArrowRight: this.active() + 1,
      ArrowLeft: this.active() - 1 + count,
      Home: 0,
      End: count - 1,
    };
    const target = moves[event.key];
    if (target === undefined || count === 0) return;
    event.preventDefault();
    const next = target % count;
    this.active.set(next);
    this.buttons()[next]?.nativeElement.focus();
  }
}
