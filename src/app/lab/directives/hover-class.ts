import { Directive, input, signal } from '@angular/core';

const DEFAULT_CLASSES = 'ring-2 ring-primary';

/**
 * ESEMPIO 2 — Eventi host + stato interno con signal
 *
 * Cosa fa: aggiunge classi CSS mentre l'host è in hover O ha il focus (tastiera = a11y).
 *   <div sbuHoverClass="ring-2 ring-info">...</div>
 *
 * Concetti:
 * - `'(mouseenter)': '...'` = listener sull'host. Angular lo registra alla creazione e lo
 *   RIMUOVE da solo quando la direttiva viene distrutta → niente memory leak, niente cleanup.
 * - `'[class]'` sull'host si FONDE con le classi statiche dell'elemento, non le sovrascrive.
 * - lo stato è un `signal`: il binding host lo legge → al cambio la view del padre è marcata
 *   dirty e (zoneless) viene schedulato un change detection.
 * - `hovered` è pubblico: chi usa questa direttiva come hostDirective può iniettarla e leggerlo.
 */
@Directive({
  selector: '[sbuHoverClass]',
  host: {
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '(focusin)': 'hovered.set(true)',
    '(focusout)': 'hovered.set(false)',
    '[class]': 'hovered() ? classes() : ""',
  },
})
export class HoverClass {
  readonly classes = input(DEFAULT_CLASSES, {
    alias: 'sbuHoverClass',
    transform: (value: string | undefined) => value || DEFAULT_CLASSES,
  });

  readonly hovered = signal(false);
}
