import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DiLog } from './di-log';

/** Mostra il log condiviso DiLog: stessa istanza root in tutti gli esempi che lo usano. */
@Component({
  selector: 'sbu-di-log-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-3 block' },
  template: `
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm font-medium">Log creazione / distruzione</span>
      <button type="button" class="btn" (click)="log.clear()">Svuota log</button>
    </div>
    <div
      role="log"
      tabindex="0"
      aria-label="Log creazione e distruzione istanze"
      class="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-xs focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ol>
        @for (entry of log.entries(); track $index) {
          <li>{{ entry }}</li>
        } @empty {
          <li class="italic">vuoto</li>
        }
      </ol>
    </div>
  `,
})
export class DiLogView {
  protected readonly log = inject(DiLog);
}
