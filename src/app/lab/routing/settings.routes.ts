import { Routes } from '@angular/router';
import { authChildGuard } from './auth.guards';
import { SettingsSection } from './settings-section';
import { SettingsShell } from './settings-shell';

/**
 * Caricato con `loadChildren: () => import('./settings.routes')`: un intero sotto-albero lazy.
 * `export default` → niente `.then(m => m.SETTINGS_ROUTES)`.
 * La shell è libera, i figli sono protetti da `canActivateChild`.
 */
export default [
  {
    path: '',
    component: SettingsShell,
    title: 'Impostazioni',
    canActivateChild: [authChildGuard],
    children: [
      { path: 'profile', component: SettingsSection, data: { heading: 'Profilo' } },
      { path: 'privacy', component: SettingsSection, data: { heading: 'Privacy' } },
    ],
  },
] satisfies Routes;
