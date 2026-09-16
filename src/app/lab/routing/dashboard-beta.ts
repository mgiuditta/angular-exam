import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Variante "beta" di /dashboard: file separato e lazy, scaricato solo se `betaGuard` fa match. */
@Component({
  selector: 'sbu-dashboard-beta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="text-base font-semibold">Dashboard BETA</h3>
    <p class="text-sm">Stesso path, route config diversa: ha vinto la prima, con <code>canMatch</code>.</p>
  `,
})
export default class DashboardBeta {}
