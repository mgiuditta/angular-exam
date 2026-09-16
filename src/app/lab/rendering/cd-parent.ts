import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RenderCounter } from './render-counter';
import { MutableUser, UserCardEager, UserCardOnPush } from './user-card';

const NAMES = ['Ada', 'Grace', 'Linus', 'Margaret'];

/**
 * Padre dell'esempio OnPush vs Eager. Passa LO STESSO oggetto a entrambi i figli.
 * I bottoni sono nel padre: ogni click marca dirty il padre → il CD lo aggiorna e scende nei figli.
 */
@Component({
  selector: 'sbu-cd-parent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserCardOnPush, UserCardEager, RenderCounter],
  host: { class: 'block' },
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn" (click)="mutate()">Muta: user().name = …</button>
      <button type="button" class="btn" (click)="replace()">Nuovo oggetto: user.update(…)</button>
      <span class="text-sm">Padre: <span sbuRenderCounter></span></span>
    </div>
    <p class="mt-2 text-sm">Valore reale nel padre: <strong data-testid="parent-name">{{ user().name }}</strong></p>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <sbu-user-card-onpush [user]="user()" />
      <sbu-user-card-eager [user]="user()" />
    </div>
  `,
})
export class CdParent {
  protected readonly user = signal<MutableUser>({ name: NAMES[0] });
  private nameIndex = 0;

  /** Anti-pattern: stesso riferimento → il signal non notifica e l'input OnPush non "cambia". */
  protected mutate(): void {
    this.user().name = this.nextName();
  }

  /** Corretto: nuovo riferimento → signal notifica, binding [user] cambia, OnPush si aggiorna. */
  protected replace(): void {
    const name = this.nextName();
    this.user.update((user) => ({ ...user, name }));
  }

  private nextName(): string {
    this.nameIndex = (this.nameIndex + 1) % NAMES.length;
    return NAMES[this.nameIndex];
  }
}
