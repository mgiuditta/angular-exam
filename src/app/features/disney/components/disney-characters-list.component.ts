import {ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal} from '@angular/core';
import {httpResource, HttpResourceRef} from '@angular/common/http';
import DisneyUtils from '../utils/disney.utils';
import {Character, DisneyResponse, Info} from '../models/disney.models';
import {DisneyCharacterCardComponent} from './disney-character-card.component';

@Component({
  selector: 'sbu-disney-characters-list',
  imports: [
    DisneyCharacterCardComponent
  ],
  template: `
    <div class="mx-auto max-w-7xl px-4 pt-4">
      <div class="relative max-w-sm">
        <svg class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
             aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="search"
          aria-label="Search characters"
          placeholder="Search characters..."
          [value]="query()"
          (input)="onInputChange($event)"
          class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
      </div>
    </div>

    @if (charactersRes.isLoading()) {
      <p role="status" class="mx-auto max-w-7xl p-4 text-sm text-muted-foreground">Loading characters…</p>
    } @else if (charactersRes.error()) {
      <p role="alert" class="mx-auto max-w-7xl p-4 text-sm text-destructive">Could not load characters. Try again
        later.</p>
    } @else {
      <div class="mx-auto grid max-w-7xl grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        @for (character of characters(); track character._id) {
          <sbu-disney-character-card [character]="character"></sbu-disney-character-card>
        } @empty {
          <div class="col-span-full flex flex-col items-center gap-2 py-16 text-center">
            <p class="text-lg font-medium text-foreground">No characters found</p>
            <p class="text-sm text-muted-foreground">Try a different search.</p>
          </div>
        }
      </div>

      @if (info(); as pageInfo) {
        <nav aria-label="Pagination" class="mx-auto flex max-w-7xl items-center justify-center gap-4 pb-8">
          <button
            type="button"
            [disabled]="!pageInfo.previousPage"
            (click)="previousPage()"
            class="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Previous
          </button>
          <span class="text-sm text-muted-foreground" aria-current="page">
            Page {{ page() }} of {{ pageInfo.totalPages }}
          </span>
          <button
            type="button"
            [disabled]="!pageInfo.nextPage"
            (click)="nextPage()"
            class="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisneyCharactersListComponent {

  private readonly disneyUtils = inject(DisneyUtils);

  protected readonly query = signal('');

  // linkedSignal: page depends on query — every new search resets to page 1
  protected readonly page = linkedSignal({
    source: this.query,
    computation: () => 1,
  });

  protected readonly charactersRes: HttpResourceRef<DisneyResponse | undefined> = httpResource<DisneyResponse>(
    () => ({
      url: this.query()
        ? this.disneyUtils.filterCharacterEndpoint(this.query())
        : this.disneyUtils.getAllCharactersEndpoint(),
      params: {
        page: this.page(),
        pageSize: 50,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    }));

  protected readonly characters = computed<Character[]>(() => this.charactersRes.value()?.data ?? []);
  protected readonly info = computed<Info | null>(() => this.charactersRes.value()?.info ?? null);

  protected onInputChange(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected previousPage(): void {
    this.page.update(p => p - 1);
  }

  protected nextPage(): void {
    this.page.update(p => p + 1);
  }

}
