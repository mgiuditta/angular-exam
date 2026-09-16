import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'sbu-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header
      class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav aria-label="Main" class="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <a
          routerLink="/"
          class="rounded-md text-base font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Angular Lab
        </a>

        <ul class="flex flex-wrap items-center gap-1 text-sm">
          @for (link of links; track link.path) {
            <li>
              <a
                [routerLink]="link.path"
                routerLinkActive="bg-secondary text-foreground"
                ariaCurrentWhenActive="page"
                class="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {{ link.label }}
              </a>
            </li>
          }
        </ul>
      </nav>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly links = [
    { path: '/directives', label: 'Direttive' },
    { path: '/pipes', label: 'Pipe' },
    { path: '/templates', label: 'Template' },
    { path: '/lifecycle', label: 'Lifecycle' },
    { path: '/rendering', label: 'Rendering' },
    { path: '/rxjs', label: 'RxJS' },
    { path: '/signals', label: 'Signal' },
    { path: '/forms', label: 'Form' },
    { path: '/http', label: 'HTTP' },
    { path: '/routing', label: 'Routing' },
    { path: '/di', label: 'DI' },
    { path: '/generics', label: 'Generici' },
    { path: '/advanced', label: 'Avanzato' },
    { path: '/typescript', label: 'TypeScript' },
    { path: '/typescript-types', label: 'TS: tipi' },
  ] as const;
}
