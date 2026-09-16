import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

let instances = 0;

/**
 * Rotta `compare/:id` letta "alla vecchia maniera" con ActivatedRoute.
 * Da compare/1 a compare/2 il componente viene RIUSATO: lo snapshot letto nel constructor
 * resta fermo al primo valore, l'Observable `paramMap` emette di nuovo.
 */
@Component({
  selector: 'sbu-compare-params',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="text-base font-semibold">snapshot vs paramMap</h3>
    <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>route.snapshot.paramMap.get('id')</dt>
      <dd>{{ snapshotId }}</dd>
      <dt>toSignal(route.paramMap)</dt>
      <dd>{{ liveId() }}</dd>
      <dt>istanza componente</dt>
      <dd>#{{ instance }}</dd>
    </dl>
  `,
})
export class CompareParams {
  private readonly route = inject(ActivatedRoute);

  protected readonly instance = ++instances;
  protected readonly snapshotId = this.route.snapshot.paramMap.get('id');
  // paramMap è basato su BehaviorSubject: emette subito, quindi requireSync evita `undefined` nel tipo
  protected readonly liveId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    requireSync: true,
  });
}
