import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  WritableSignal
} from '@angular/core';
import {DisneyService} from '../service/disney.service';
import {Character, DisneyResponse, Info} from '../models/disney.models';
import {DisneyCharacterCardComponent} from './disney-character-card.component';
import {Subscription} from 'rxjs';

@Component({
  selector: 'sbu-disney-characters-list',
  imports: [
    DisneyCharacterCardComponent
  ],
  template: `
    <div class="mx-auto grid max-w-7xl grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      @for (character of characters(); track character._id) {
        <sbu-disney-character-card [character]="character"></sbu-disney-character-card>
      } @empty {
        <div class="col-span-full flex flex-col items-center gap-2 py-16 text-center">
          <p class="text-lg font-medium text-foreground">No characters found</p>
          <p class="text-sm text-muted-foreground">Try again later.</p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisneyCharactersListComponent implements OnInit, OnDestroy {

  disney = inject(DisneyService);

  response: WritableSignal<DisneyResponse | null> = signal<DisneyResponse | null>(null);
  characters: Signal<Character[]> = computed<Character[]>(() => this.response()?.data || []);

  currentInfo: Signal<Info | null> = computed<Info | null>(() => this.response()?.info || null);
  nextPage: Signal<string | null> = computed<string | null>(() => this.currentInfo()?.nextPage || null);
  previousPage: Signal<string | null> = computed<string | null>(() => this.currentInfo()?.previousPage || null);

  private subscription: Subscription = Subscription.EMPTY;

  ngOnInit(): void {
    this.subScribeToCharacters();
  }

  private subScribeToCharacters(): void {
    this.subscription = this.disney.getAllCharacters()
      .subscribe((response: DisneyResponse): void => {
        this.response.set(response)
      })
  }

  isNotEmpty(): boolean {
    return this.characters().length > 0;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
