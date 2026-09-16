import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  inject,
  input,
  signal,
} from '@angular/core';

let nextId = 0;

/**
 * ESEMPIO 5 — DOM creato a mano + cleanup con DestroyRef
 *
 * Cosa fa: mostra un tooltip (appeso a <body>) in hover/focus, lo nasconde con Esc o uscita.
 *   <button sbuTooltip="Salva il documento">Salva</button>
 *
 * Concetti:
 * - `Renderer2` invece di document.createElement: astrazione che funziona anche in SSR/web worker.
 * - il tooltip vive FUORI dal template → Angular non sa che esiste →
 *   se l'host viene distrutto mentre il tooltip è visibile, resterebbe orfano nel body.
 * - `inject(DestroyRef).onDestroy(fn)` = equivalente componibile di ngOnDestroy:
 *   si registra in injection context, può stare in funzioni riusabili, restituisce una
 *   funzione per de-registrarsi.
 * - a11y: role="tooltip" + aria-describedby sull'host solo quando il tooltip esiste
 *   (un id che punta a un elemento assente è un errore AXE).
 */
@Directive({
  selector: '[sbuTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(focusin)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.aria-describedby]': 'visible() ? tipId : null',
  },
})
export class Tooltip {
  readonly text = input.required<string>({ alias: 'sbuTooltip' });

  protected readonly tipId = `sbu-tooltip-${nextId++}`;
  protected readonly visible = signal(false);

  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private tip: HTMLElement | null = null;

  constructor() {
    // Commenta questa riga, apri il tooltip e distruggi l'host: il tooltip resta nel <body>.
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  show(): void {
    if (this.tip) return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const tip: HTMLElement = this.renderer.createElement('div');
    this.renderer.setAttribute(tip, 'id', this.tipId);
    this.renderer.setAttribute(tip, 'role', 'tooltip');
    this.renderer.setAttribute(
      tip,
      'class',
      'pointer-events-none absolute z-50 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-md',
    );
    this.renderer.setStyle(tip, 'top', `${rect.bottom + window.scrollY + 6}px`);
    this.renderer.setStyle(tip, 'left', `${rect.left + window.scrollX}px`);
    this.renderer.appendChild(tip, this.renderer.createText(this.text()));
    this.renderer.appendChild(this.document.body, tip);
    this.tip = tip;
    this.visible.set(true);
  }

  hide(): void {
    if (!this.tip) return;
    this.renderer.removeChild(this.document.body, this.tip);
    this.tip = null;
    this.visible.set(false);
  }
}
