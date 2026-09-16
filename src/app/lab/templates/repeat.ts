import {
  Directive,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';

export interface RepeatContext<T> {
  $implicit: T;
  index: number;
  count: number;
  first: boolean;
  last: boolean;
}

/**
 * ESEMPIO 7 — Strutturale con context, microsyntax, trackBy e type guard
 *
 *   <li *sbuRepeat="let user of users(); trackBy: byId; index as i; first as isFirst">
 *     {{ i }} - {{ user.name }}
 *   </li>
 *
 * Microsyntax → input:
 *   `of users()`   → sbuRepeatOf
 *   `trackBy: fn`  → sbuRepeatTrackBy
 * Microsyntax → context:
 *   `let user`        → $implicit
 *   `index as i`      → context.index
 *
 * Type checking: `ngTemplateContextGuard` dice al compilatore il tipo del context →
 * `user` è tipizzato come T invece di `any` (strictTemplates).
 *
 * Lifecycle + trackBy (perché esiste `track` in @for):
 * - con chiave già vista la view viene RIUSATA e SPOSTATA (vcr.move): niente destroy/create,
 *   lo stato DOM (testo in un input, focus) sopravvive.
 * - chiave nuova → createEmbeddedView (nascono i componenti dentro).
 * - chiave sparita → view.destroy() (ngOnDestroy dei componenti dentro).
 */
@Directive({ selector: '[sbuRepeat]' })
export class Repeat<T> {
  readonly items = input.required<readonly T[]>({ alias: 'sbuRepeatOf' });
  readonly trackBy = input<(item: T) => unknown>((item) => item, { alias: 'sbuRepeatTrackBy' });

  private readonly template = inject<TemplateRef<RepeatContext<T>>>(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private views = new Map<unknown, EmbeddedViewRef<RepeatContext<T>>>();

  /** Numero di view create da zero: serve a mostrare il riuso. */
  created = 0;

  constructor() {
    effect(() => {
      const items = this.items();
      const trackBy = this.trackBy();
      const next = new Map<unknown, EmbeddedViewRef<RepeatContext<T>>>();

      items.forEach((item, index) => {
        const context: RepeatContext<T> = {
          $implicit: item,
          index,
          count: items.length,
          first: index === 0,
          last: index === items.length - 1,
        };
        const key = trackBy(item);
        const reused = this.views.get(key);
        if (reused) {
          this.views.delete(key);
          Object.assign(reused.context, context);
          this.vcr.move(reused, index);
          next.set(key, reused);
        } else {
          next.set(key, this.vcr.createEmbeddedView(this.template, context, index));
          this.created++;
        }
      });

      // ciò che resta nella vecchia mappa non esiste più
      this.views.forEach((view) => view.destroy());
      this.views = next;
    });
  }

  static ngTemplateContextGuard<T>(_dir: Repeat<T>, _ctx: unknown): _ctx is RepeatContext<T> {
    return true;
  }
}
