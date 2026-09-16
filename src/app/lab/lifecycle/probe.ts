import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DoCheck,
  ElementRef,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  afterEveryRender,
  afterNextRender,
  contentChild,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { LifecycleLog } from './lifecycle-log';

/**
 * Componente "sonda": registra TUTTI gli hook nell'ordine in cui Angular li chiama.
 *
 * ORDINE (prima creazione) — da sapere a memoria:
 *  1. constructor              DI ok, input NON ancora impostati
 *  2. ngOnChanges              solo se ci sono input bindati; prima di ngOnInit e a ogni cambio input
 *  3. ngOnInit                 una volta, input disponibili
 *  4. ngDoCheck                a ogni CD del PADRE (anche se questo componente è OnPush e non dirty)
 *  5. ngAfterContentInit       una volta, dopo che il contenuto proiettato (<ng-content>) è pronto
 *  6. ngAfterContentChecked    a ogni CD
 *     (effect del componente)  girano durante il CD, prima del render del template del componente
 *  7. ngAfterViewInit          una volta, dopo la view del componente e dei suoi figli
 *  8. ngAfterViewChecked       a ogni CD
 *  9. afterNextRender          una volta, dopo che il DOM del browser è aggiornato (no SSR)
 *     afterEveryRender         dopo ogni render dell'applicazione
 * 10. ngOnDestroy / DestroyRef.onDestroy  alla distruzione (@if falso, vcr.clear, navigazione)
 *
 * Signal query (viewChild/contentChild) vs decorator:
 * - non esiste `static: true`: il signal restituisce il risultato appena i nodi esistono.
 *   Per nodi non condizionali può essere già valorizzato in ngOnInit (vedi log);
 *   la garanzia in ogni caso è ngAfterContentInit (content) / ngAfterViewInit (view).
 * - essendo signal, meglio derivarli con computed() che leggerli negli hook.
 *
 * Moderno vs classico: effect ≈ ngOnChanges reattivo, DestroyRef ≈ ngOnDestroy,
 * afterNextRender ≈ ngAfterViewInit per lavoro sul DOM.
 */
@Component({
  selector: 'sbu-probe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="rounded-md border border-border p-2 text-sm">
      <span #viewEl>Probe <strong>{{ name() }}</strong></span>
      <ng-content />
    </div>
  `,
})
export class Probe
  implements
    OnChanges,
    OnInit,
    DoCheck,
    AfterContentInit,
    AfterContentChecked,
    AfterViewInit,
    AfterViewChecked,
    OnDestroy
{
  readonly name = input.required<string>();

  private readonly log = inject(LifecycleLog);
  private readonly projected = contentChild<ElementRef>('projected');
  private readonly viewEl = viewChild<ElementRef>('viewEl');

  constructor() {
    // this.name() qui lancerebbe NG0950: input.required non ancora impostato.
    this.log.add('?', 'constructor (input non disponibili)');

    effect(() => this.write(`effect: name = "${this.name()}"`));

    afterNextRender(() => this.write('afterNextRender (DOM pronto)'));
    afterEveryRender(() => this.log.count(`${this.name()}: afterEveryRender`));

    inject(DestroyRef).onDestroy(() => this.write('DestroyRef.onDestroy'));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['name'];
    if (!change) return;
    this.write(
      change.firstChange
        ? `ngOnChanges: name = "${change.currentValue}" (firstChange)`
        : `ngOnChanges: "${change.previousValue}" → "${change.currentValue}"`,
    );
  }

  ngOnInit(): void {
    this.write(
      `ngOnInit (viewChild: ${this.viewEl() ? 'presente' : 'undefined'}, contentChild: ${this.projected() ? 'presente' : 'undefined'})`,
    );
  }

  ngDoCheck(): void {
    this.log.count(`${this.name()}: ngDoCheck`);
  }

  ngAfterContentInit(): void {
    this.write(`ngAfterContentInit (contentChild: ${this.projected() ? 'presente' : 'undefined'})`);
  }

  ngAfterContentChecked(): void {
    this.log.count(`${this.name()}: ngAfterContentChecked`);
  }

  ngAfterViewInit(): void {
    this.write(`ngAfterViewInit (viewChild: ${this.viewEl() ? 'presente' : 'undefined'})`);
  }

  ngAfterViewChecked(): void {
    this.log.count(`${this.name()}: ngAfterViewChecked`);
  }

  ngOnDestroy(): void {
    this.write('ngOnDestroy');
  }

  private write(message: string): void {
    this.log.add(this.name(), message);
  }
}
