import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  afterNextRender,
  afterRenderEffect,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Leggere/scrivere il DOM DOPO il render, nelle fasi giuste.
 *
 * Ordine delle fasi per ogni render: earlyRead → write → mixedReadWrite → read.
 * - earlyRead: SOLO letture necessarie a una write successiva (misure)
 * - write:     SOLO scritture (style, classi, textContent)
 * - mixedReadWrite: lettura e scrittura insieme (evitarla: forza layout sincroni)
 * - read:      SOLO letture dopo le scritture
 * Separare le fasi evita il "layout thrashing" (read/write alternati che forzano reflow).
 *
 * - afterNextRender:   una sola volta (es. focus, init di librerie). Callback singola = mixedReadWrite.
 * - afterEveryRender:  dopo OGNI render dell'app, anche se il cambiamento è altrove. Le fasi si passano VALORI.
 * - afterRenderEffect: effect che gira dopo il render SOLO se i signal letti sono cambiati.
 *                      Le fasi si passano SIGNAL; supporta onCleanup.
 * Tutti: solo browser (mai in SSR), injection context, restituiscono AfterRenderRef (destroy()).
 */
@Component({
  selector: 'sbu-measure-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-wrap items-end gap-2">
      <label class="flex flex-col gap-1 text-sm">
        Testo da misurare
        <input #textInput class="field" [value]="text()" (input)="text.set(textInput.value)" />
      </label>
      <button type="button" class="btn" [attr.aria-pressed]="big()" (click)="big.set(!big())">
        Font grande (solo CSS)
      </button>
    </div>

    <div class="mt-3 overflow-x-auto">
      <span #measured class="inline-block whitespace-nowrap" [class.text-2xl]="big()">{{ text() }}</span>
      <div #bar class="mt-1 h-1 w-0 rounded bg-primary"></div>
    </div>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>afterNextRender (prima misura)</dt>
      <dd #firstOut class="tabular-nums">—</dd>
      <dt>afterRenderEffect (legge solo text())</dt>
      <dd #effectOut class="tabular-nums">—</dd>
      <dt>afterEveryRender</dt>
      <dd #everyOut class="tabular-nums">—</dd>
    </dl>
  `,
})
export class MeasureBox {
  protected readonly text = signal('Angular');
  protected readonly big = signal(false);

  private readonly measured = viewChild.required<ElementRef<HTMLElement>>('measured');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly firstOut = viewChild.required<ElementRef<HTMLElement>>('firstOut');
  private readonly effectOut = viewChild.required<ElementRef<HTMLElement>>('effectOut');
  private readonly everyOut = viewChild.required<ElementRef<HTMLElement>>('everyOut');

  private everyRenders = 0;

  constructor() {
    afterNextRender({
      earlyRead: () => this.width(),
      write: (width) => (this.firstOut().nativeElement.textContent = `${width}px`),
    });

    afterRenderEffect({
      earlyRead: () => {
        this.text(); // dipendenza esplicita: big() NON è letto → cambiare solo il font non rilancia l'effetto
        return this.width();
      },
      write: (width) => {
        this.bar().nativeElement.style.width = `${width()}px`;
        this.effectOut().nativeElement.textContent = `${width()}px`;
      },
    });

    afterEveryRender({
      earlyRead: () => this.width(),
      write: (width) => {
        this.everyRenders++;
        this.everyOut().nativeElement.textContent = `${width}px (render ×${this.everyRenders})`;
      },
    });
  }

  private width(): number {
    return Math.round(this.measured().nativeElement.getBoundingClientRect().width);
  }
}
