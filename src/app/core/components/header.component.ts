import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'sbu-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header
      class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav aria-label="Main" class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <a
          routerLink="/disney"
          class="rounded-md text-base font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Disney Explorer
        </a>

        <ul class="flex items-center gap-1 text-sm">
          <li>
            <a
              routerLink="/disney"
              routerLinkActive="bg-secondary text-foreground"
              ariaCurrentWhenActive="page"
              class="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Characters
            </a>
          </li>
        </ul>
      </nav>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {}
