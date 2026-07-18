import {ChangeDetectionStrategy, Component, input, InputSignal} from '@angular/core';
import {Character} from '../models/disney.models';

@Component({
  selector: 'sbu-disney-character-card',
  template: `
    @defer (on viewport; prefetch on idle) {
      <article
        class="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1 focus-within:shadow-lg">
        <figure class="relative aspect-square overflow-hidden bg-muted">
          <img
            [src]="character().imageUrl"
            [alt]="character().name"
            loading="lazy"
            class="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"/>
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"></div>
        </figure>
        <div class="flex flex-1 flex-col gap-3 p-4">
          <h2 class="line-clamp-2 text-lg font-semibold leading-tight tracking-tight">{{ character().name }}</h2>
          <ul class="flex flex-wrap gap-1.5 text-xs font-medium" aria-label="Appearances">
            @if (character().films.length) {
              <li class="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                🎬 {{ character().films.length }} films
              </li>
            }
            @if (character().tvShows.length) {
              <li class="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                📺 {{ character().tvShows.length }} TV shows
              </li>
            }
            @if (character().videoGames.length) {
              <li class="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                🎮 {{ character().videoGames.length }} games
              </li>
            }
          </ul>
          <a
            [href]="character().sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            View on Disney Wiki
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </article>
    } @placeholder {
      <div
        class="flex h-full animate-pulse flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        aria-hidden="true">
        <div class="aspect-square bg-muted"></div>
        <div class="flex flex-1 flex-col gap-3 p-4">
          <div class="h-5 w-3/4 rounded bg-muted"></div>
          <div class="flex gap-1.5">
            <div class="h-6 w-16 rounded-full bg-muted"></div>
            <div class="h-6 w-20 rounded-full bg-muted"></div>
          </div>
          <div class="mt-auto h-9 rounded-md bg-muted"></div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisneyCharacterCardComponent {
  character: InputSignal<Character> = input.required<Character>();
}
