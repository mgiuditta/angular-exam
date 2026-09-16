import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Variante di fallback di /dashboard: la route senza guard dichiarata DOPO quella beta. */
@Component({
  selector: 'sbu-dashboard-classic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="text-base font-semibold">Dashboard classica</h3>
    <p class="text-sm"><code>betaGuard</code> ha restituito false: il router ha provato la route successiva.</p>
  `,
})
export class DashboardClassic {}
