import {
  Directive,
  ElementRef,
  InjectionToken,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';

export type Role = 'guest' | 'editor' | 'admin';

const RANK: Record<Role, number> = { guest: 0, editor: 1, admin: 2 };

/**
 * Ruolo corrente. InjectionToken senza `providedIn`: DEVE essere fornito da un antenato
 * (qui: `providers` di AdvancedPage) → esempio di DI gerarchica tramite element injector.
 */
export const CURRENT_ROLE = new InjectionToken<WritableSignal<Role>>('CURRENT_ROLE');

/**
 * ESEMPIO 3 — Una direttiva, due modalità (inject optional)
 *
 *   <button sbuRequireRole="admin">Elimina</button>   → attributo: disabilita se il ruolo non basta
 *   <p *sbuRequireRole="'editor'">Bozza</p>           → strutturale: rimuove il contenuto
 *
 * Concetti:
 * - `inject(TemplateRef, { optional: true })`: c'è solo se la direttiva è su un <ng-template>
 *   (cioè usata con `*`). Senza optional → NullInjectorError nella forma attributo.
 * - `inject()` condizionale è lecito finché è sincrono nel constructor (injection context).
 * - le dipendenze da antenati (CURRENT_ROLE) si risolvono risalendo l'albero degli elementi,
 *   poi l'environment injector (route → root).
 */
@Directive({ selector: '[sbuRequireRole]' })
export class RequireRole {
  readonly required = input.required<Role>({ alias: 'sbuRequireRole' });

  private readonly role = inject(CURRENT_ROLE);
  private readonly allowed = computed(() => RANK[this.role()] >= RANK[this.required()]);

  constructor() {
    const template = inject(TemplateRef, { optional: true });

    if (template) {
      const vcr = inject(ViewContainerRef);
      effect(() => {
        vcr.clear();
        if (this.allowed()) vcr.createEmbeddedView(template);
      });
      return;
    }

    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    effect(() =>
      this.allowed()
        ? renderer.removeAttribute(host, 'disabled')
        : renderer.setAttribute(host, 'disabled', ''),
    );
  }
}
