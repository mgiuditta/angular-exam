import { DestroyRef, Directive, DoCheck, ElementRef, inject } from '@angular/core';

const FLASH_CLASSES = ['bg-warning/30', 'outline', 'outline-warning'];
const FLASH_MS = 400;

/**
 * Contatore di render: conta quante volte viene ricontrollata (refresh) la view che CONTIENE l'elemento.
 *
 *   <span sbuRenderCounter></span>   // nel template del componente da osservare
 *
 * Perché funziona:
 * - ngDoCheck di una DIRETTIVA è registrato nella view in cui l'elemento è dichiarato
 *   → gira solo quando QUELLA view viene aggiornata. Un componente OnPush non dirty viene saltato
 *   e quindi anche questo hook. (Diverso dal ngDoCheck di un COMPONENTE: lo chiama la view del padre.)
 * - Nel secondo giro di verifica in dev mode (checkNoChanges) gli hook NON girano: il conteggio è esatto.
 * - Scrive direttamente nel DOM, senza binding né signal: niente NG0100 e niente loop di CD.
 */
@Directive({
  selector: '[sbuRenderCounter]',
  host: { class: 'inline-block rounded px-1 tabular-nums transition-colors motion-reduce:transition-none' },
})
export class RenderCounter implements DoCheck {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private renders = 0;
  private flashTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.flashTimeout));
  }

  ngDoCheck(): void {
    this.renders++;
    this.element.textContent = `render ×${this.renders}`;
    this.element.classList.add(...FLASH_CLASSES);
    clearTimeout(this.flashTimeout);
    this.flashTimeout = setTimeout(() => this.element.classList.remove(...FLASH_CLASSES), FLASH_MS);
  }
}
