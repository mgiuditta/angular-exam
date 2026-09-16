import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Usato SOLO dentro un blocco @defer → il compilatore lo mette in un chunk separato.
 * Se fosse referenziato anche fuori dal @defer (template o TS) finirebbe nel bundle principale:
 * il blocco verrebbe comunque rinviato, ma senza risparmio di codice.
 */
@Component({
  selector: 'sbu-heavy-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `<p class="text-sm">Report istanziato alle {{ createdAt | date: 'HH:mm:ss' }}</p>`,
})
export class HeavyReport {
  // Il constructor gira solo quando scatta il trigger del @defer.
  protected readonly createdAt = Date.now();
}
