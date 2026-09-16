import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Componenti minimi per ngComponentOutlet (ESEMPIO 5).
 * Stessa API di input → intercambiabili a runtime.
 */
@Component({
  selector: 'sbu-info-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p role="status" class="rounded-md border border-info p-2 text-sm">ℹ️ {{ message() }}</p>`,
})
export class InfoAlert {
  readonly message = input.required<string>();
}

@Component({
  selector: 'sbu-warning-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p role="alert" class="rounded-md border border-warning p-2 text-sm">⚠️ {{ message() }}</p>`,
})
export class WarningAlert {
  readonly message = input.required<string>();
}
