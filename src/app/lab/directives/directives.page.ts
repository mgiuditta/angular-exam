import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Example, LabPage } from '../shared/example';
import { AutoFocus } from './auto-focus';
import { ClickOutside } from './click-outside';
import { FancyButton } from './fancy-button';
import { Highlight } from './highlight';
import { HoverClass } from './hover-class';
import { Tooltip } from './tooltip';

/**
 * Pagina: DIRETTIVE DI ATTRIBUTO
 *
 * Direttiva = classe con @Directive che AGGIUNGE comportamento a un elemento esistente.
 * Componente = direttiva CON template (un elemento può avere 1 solo componente, N direttive).
 *
 * Checklist certificazione:
 * - standalone di default (v19+): si importano in `imports` del componente che le usa.
 * - input()/output()/model() al posto di @Input/@Output.
 * - `host: {}` al posto di @HostBinding/@HostListener.
 * - DI con inject(): ElementRef, Renderer2, DestroyRef, TemplateRef, ViewContainerRef...
 * - le direttive strutturali (con `*`) sono nella pagina Template.
 */
@Component({
  selector: 'sbu-directives-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, Highlight, HoverClass, AutoFocus, ClickOutside, Tooltip, FancyButton],
  template: `
    <sbu-lab-page heading="Direttive di attributo">
      <span intro>Dal binding host più semplice alla composizione con <code>hostDirectives</code>.</span>

      <sbu-example [n]="1" title="Highlight: input con alias + host binding">
        <p sbuHighlight>Default (attributo senza valore → transform)</p>
        <p sbuHighlight="#bbf7d0">Valore statico</p>
        <p [sbuHighlight]="color()" #h="sbuHighlight">
          Binding dinamico — letto via exportAs: <code>{{ h.color() }}</code>
        </p>
        <button type="button" class="btn mt-2" (click)="toggleColor()">Cambia colore</button>
        <p note>Gli input sono disponibili da <code>ngOnChanges</code>/<code>ngOnInit</code>, non nel constructor.</p>
      </sbu-example>

      <sbu-example [n]="2" title="HoverClass: eventi host + signal">
        <button type="button" sbuHoverClass class="btn">Passa col mouse o usa Tab</button>
        <p note>I listener <code>host</code> vengono rimossi automaticamente alla distruzione.</p>
      </sbu-example>

      <sbu-example [n]="3" title="AutoFocus: afterNextRender">
        <button type="button" class="btn" (click)="editing.set(!editing())">
          {{ editing() ? 'Chiudi' : 'Modifica' }}
        </button>
        @if (editing()) {
          <label class="mt-2 flex flex-col gap-1 text-sm">
            Nome
            <input sbuAutoFocus class="field" />
          </label>
        }
        <p note>Ogni volta che il blocco <code>&#64;if</code> ricrea l'input, la direttiva rinasce e rimette il focus.</p>
      </sbu-example>

      <sbu-example [n]="4" title="ClickOutside: output + document:click">
        <div sbuClickOutside (clickOutside)="menuOpen.set(false)" class="relative inline-block">
          <button
            type="button"
            class="btn"
            aria-controls="demo-menu"
            [attr.aria-expanded]="menuOpen()"
            (click)="menuOpen.set(!menuOpen())"
          >
            Menu
          </button>
          @if (menuOpen()) {
            <ul id="demo-menu" class="absolute z-10 mt-1 w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
              <li class="px-2 py-1">Voce 1</li>
              <li class="px-2 py-1">Voce 2</li>
            </ul>
          }
        </div>
        <p note>Clicca fuori dal menu per chiuderlo.</p>
      </sbu-example>

      <sbu-example [n]="5" title="Tooltip: Renderer2 + DestroyRef" level="intermedio">
        @if (tooltipHostAlive()) {
          <button type="button" class="btn" sbuTooltip="Cliccami: mi distruggo" (click)="tooltipHostAlive.set(false)">
            Hover e poi click
          </button>
        } @else {
          <button type="button" class="btn" (click)="tooltipHostAlive.set(true)">Ricrea</button>
        }
        <p note>Il click distrugge l'host con il tooltip aperto: <code>DestroyRef.onDestroy</code> lo rimuove dal body.</p>
      </sbu-example>

      <sbu-example [n]="6" title="FancyButton: hostDirectives" level="avanzato">
        <button sbuFancy tooltip="Tooltip da hostDirective" hoverClass="ring-2 ring-info">Fancy</button>
        <p note>Le host directive nascono prima del componente host e sono iniettabili con <code>inject()</code>.</p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class DirectivesPage {
  protected readonly color = signal('#fecaca');
  protected readonly editing = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly tooltipHostAlive = signal(true);

  protected toggleColor(): void {
    this.color.update((c) => (c === '#fecaca' ? '#bfdbfe' : '#fecaca'));
  }
}
