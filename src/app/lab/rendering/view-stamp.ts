import { ChangeDetectionStrategy, Component } from '@angular/core';

let created = 0;

/**
 * Timbro di creazione: il numero è assegnato nel constructor e non cambia mai.
 * Se in una riga di @for il numero cambia, la view della riga è stata DISTRUTTA e RICREATA.
 */
@Component({
  selector: 'sbu-view-stamp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'shrink-0 rounded bg-secondary px-1.5 font-mono text-xs text-secondary-foreground' },
  template: `view #{{ id }}`,
})
export class ViewStamp {
  protected readonly id = ++created;
}
