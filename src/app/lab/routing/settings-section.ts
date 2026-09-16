import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Un solo componente per più rotte: il titolo arriva da `data: { heading }` via input binding. */
@Component({
  selector: 'sbu-settings-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="text-sm">Sezione protetta da canActivateChild: <strong>{{ heading() }}</strong></p>`,
})
export class SettingsSection {
  readonly heading = input.required<string>();
}
