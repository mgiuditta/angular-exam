import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {Character} from '../models/disney.models';
import {RouterLink} from '@angular/router';

interface AppearanceSection {
  label: string;
  items: string[];
}

@Component({
  selector: 'sbu-disney-character-details',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-5xl p-4 md:p-6">
      <a
        routerLink="/disney"
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        Back to characters
      </a>

      <article class="mt-4 grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] md:gap-8">
        <figure
          class="overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
          <img
            [src]="character().imageUrl"
            [alt]="character().name"
            class="aspect-square w-full object-cover object-top"/>
        </figure>

        <div class="flex flex-col gap-5">
          <header class="flex flex-col gap-3">
            <h1 class="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {{ character().name }}
            </h1>
            @if (totalAppearances() > 0) {
              <p class="text-sm text-muted-foreground">
                {{ totalAppearances() }} appearances across films, TV and games
              </p>
            }
          </header>

          @for (section of sections(); track section.label) {
            <section class="flex flex-col gap-2">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {{ section.label }}
              </h2>
              <ul class="flex flex-wrap gap-1.5">
                @for (item of section.items; track item) {
                  <li
                    class="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {{ item }}
                  </li>
                }
              </ul>
            </section>
          } @empty {
            <p class="text-sm text-muted-foreground">No recorded appearances yet.</p>
          }

          @if (character().sourceUrl) {
            <a
              [href]="character().sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-auto inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Read more on the wiki
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 3h6v6"/>
                <path d="M10 14 21 3"/>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              </svg>
              <span class="sr-only">(opens in a new tab)</span>
            </a>
          }
        </div>
      </article>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisneyCharacterDetailsComponent {
  // resolved via route `resolve.character` + withComponentInputBinding
  readonly character = input.required<Character>();

  protected readonly sections = computed<AppearanceSection[]>(() => {
    const c = this.character();
    return [
      {label: 'Films', items: c.films},
      {label: 'Short films', items: c.shortFilms},
      {label: 'TV shows', items: c.tvShows},
      {label: 'Video games', items: c.videoGames},
      {label: 'Park attractions', items: c.parkAttractions},
    ].filter(s => s.items.length > 0);
  });

  protected readonly totalAppearances = computed(() =>
    this.sections().reduce((sum, s) => sum + s.items.length, 0),
  );
}
