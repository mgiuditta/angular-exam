import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Componente padre di settings.routes.ts: ha un suo `<router-outlet />` (terzo livello di annidamento).
 * I link relativi (`profile`) si risolvono rispetto alla rotta di QUESTO componente.
 */
@Component({
  selector: 'sbu-settings-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <h3 class="text-base font-semibold">Impostazioni (loadChildren)</h3>
    <nav aria-label="Sezioni impostazioni" class="mt-2 flex flex-wrap gap-2">
      @for (section of sections; track section.path) {
        <a
          class="btn"
          [routerLink]="section.path"
          routerLinkActive="bg-secondary"
          ariaCurrentWhenActive="page"
        >
          {{ section.label }}
        </a>
      }
    </nav>
    <div class="mt-3">
      <router-outlet />
    </div>
  `,
})
export class SettingsShell {
  protected readonly sections = [
    { path: 'profile', label: 'Profilo' },
    { path: 'privacy', label: 'Privacy' },
  ] as const;
}
