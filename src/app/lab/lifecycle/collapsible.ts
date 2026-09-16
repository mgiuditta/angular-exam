import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, input, signal } from '@angular/core';

let nextId = 0;

/**
 * Pannello apri/chiudi usato per mostrare la differenza di lifecycle tra:
 * - <ng-content>: il contenuto proiettato è istanziato dal PADRE comunque, anche a pannello chiuso.
 *   Il `@if` qui decide solo DOVE/SE attaccarlo al DOM, non se crearlo.
 *   Chiudendo il pannello il contenuto NON viene distrutto (vive quanto il padre).
 * - `lazyContent` (TemplateRef): la view nasce all'apertura e muore alla chiusura.
 *   È il pattern di mat-expansion-panel `matExpansionPanelContent`, tabs lazy, ecc.
 */
@Component({
  selector: 'sbu-collapsible',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: { class: 'block' },
  template: `
    <button type="button" class="btn" [attr.aria-expanded]="open()" [attr.aria-controls]="panelId" (click)="open.set(!open())">
      {{ open() ? 'Chiudi' : 'Apri' }} {{ label() }}
    </button>
    @if (open()) {
      <div [id]="panelId" class="mt-2">
        <ng-content />
        @if (lazyContent(); as template) {
          <ng-container [ngTemplateOutlet]="template" />
        }
      </div>
    }
  `,
})
export class Collapsible {
  readonly label = input.required<string>();
  readonly lazyContent = input<TemplateRef<unknown>>();

  protected readonly open = signal(false);
  protected readonly panelId = `collapsible-${nextId++}`;
}
