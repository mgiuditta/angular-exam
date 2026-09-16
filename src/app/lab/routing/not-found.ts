import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Rotta `**`: cattura qualsiasi URL sotto /routing non riconosciuto. Va dichiarata per ULTIMA. */
@Component({
  selector: 'sbu-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="text-base font-semibold">404 · Rotta non trovata</h3>
    <p class="text-sm">Nessuna route config corrisponde: ha vinto il wildcard <code>**</code>.</p>
  `,
})
export class NotFound {}
