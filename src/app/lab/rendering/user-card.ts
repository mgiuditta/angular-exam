import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RenderCounter } from './render-counter';

/** Oggetto MUTABILE di proposito: serve a mostrare la mutazione in place. */
export interface MutableUser {
  name: string;
}

const CARD_TEMPLATE = `
  <div class="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
    <p class="font-medium">{{ strategy }}</p>
    <p>Nome: <strong data-testid="name">{{ user().name }}</strong></p>
    <p>Click interni: {{ clicks() }}</p>
    <p>Refresh: <span sbuRenderCounter></span></p>
    <button type="button" class="btn self-start" (click)="clicks.update(increment)">Click nel figlio</button>
  </div>
`;

/**
 * OnPush: la view viene ricontrollata SOLO se
 * 1. un input cambia RIFERIMENTO (confronto con ===, non deep)
 * 2. un evento nasce nel suo template/host (listener)
 * 3. un signal letto nel suo template cambia
 * 4. qualcuno chiama markForCheck() (es. pipe async)
 * Altrimenti il CD la salta, insieme a tutti i suoi discendenti non marcati.
 */
@Component({
  selector: 'sbu-user-card-onpush',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RenderCounter],
  host: { class: 'block' },
  template: CARD_TEMPLATE,
})
export class UserCardOnPush {
  readonly user = input.required<MutableUser>();
  protected readonly strategy = 'OnPush';
  protected readonly clicks = signal(0);
  protected readonly increment = (n: number) => n + 1;
}

/**
 * Eager (ex `Default`, deprecato come nome in v21): ricontrollata OGNI volta che il CD la raggiunge.
 * Eccezione voluta alla regola OnPush del progetto: serve il confronto.
 * Nota zoneless: "la raggiunge" solo se il padre viene aggiornato; sotto un padre OnPush non dirty resta ferma.
 */
@Component({
  selector: 'sbu-user-card-eager',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RenderCounter],
  host: { class: 'block' },
  template: CARD_TEMPLATE,
})
export class UserCardEager {
  readonly user = input.required<MutableUser>();
  protected readonly strategy = 'Eager (Default)';
  protected readonly clicks = signal(0);
  protected readonly increment = (n: number) => n + 1;
}
