import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Caricato con `loadComponent: () => import('./admin-panel')`.
 * `export default` → il router usa direttamente il default export, niente `.then(m => m.AdminPanel)`.
 */
@Component({
  selector: 'sbu-admin-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="text-base font-semibold">Area admin</h3>
    <p class="text-sm">
      Chunk lazy scaricato solo dopo che <code>authGuard</code> ha restituito <code>true</code>. Fare logout ora NON
      ti butta fuori: le guard girano solo durante una navigazione.
    </p>
  `,
})
export default class AdminPanel {}
