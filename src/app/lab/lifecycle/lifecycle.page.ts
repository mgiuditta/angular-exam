import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { Unless } from '../templates/unless';
import { Collapsible } from './collapsible';
import { LifecycleLog } from './lifecycle-log';
import { Probe } from './probe';

const CODE = {
  creation: ts`
    @if (showA()) {
      <sbu-probe name="A" />
    }

    export class Probe implements OnInit, AfterContentInit, AfterViewInit, OnDestroy {
      readonly name = input.required<string>();

      constructor() {
        // this.name() qui → NG0950: input non ancora impostato
        afterNextRender(() => this.write('afterNextRender (DOM pronto)'));
        inject(DestroyRef).onDestroy(() => this.write('DestroyRef.onDestroy'));
      }

      ngOnInit(): void { this.write('ngOnInit'); }
      ngAfterContentInit(): void { this.write('ngAfterContentInit'); }
      ngAfterViewInit(): void { this.write('ngAfterViewInit'); }
      ngOnDestroy(): void { this.write('ngOnDestroy'); }
    }
  `,
  inputChange: ts`
    <sbu-probe [name]="probeName()" />
    rename(): void { this.probeName.set(\`B\${++this.renames}\`); }

    // Probe
    constructor() {
      effect(() => this.write(\`effect: name = "\${this.name()}"\`));
    }

    ngOnChanges(changes: SimpleChanges): void {
      const change = changes['name'];
      if (!change) return;
      this.write(
        change.firstChange
          ? \`ngOnChanges: name = "\${change.currentValue}" (firstChange)\`
          : \`ngOnChanges: "\${change.previousValue}" → "\${change.currentValue}"\`,
      );
    }
  `,
  queries: ts`
    <sbu-probe name="C">
      <em #projected>contenuto proiettato</em>
    </sbu-probe>

    // template di Probe: <span #viewEl>Probe {{ name() }}</span><ng-content />
    private readonly projected = contentChild<ElementRef>('projected'); // garantito in ngAfterContentInit
    private readonly viewEl = viewChild<ElementRef>('viewEl');          // garantito in ngAfterViewInit

    ngAfterContentInit(): void {
      this.write(\`ngAfterContentInit (contentChild: \${this.projected() ? 'presente' : 'undefined'})\`);
    }

    ngAfterViewInit(): void {
      this.write(\`ngAfterViewInit (viewChild: \${this.viewEl() ? 'presente' : 'undefined'})\`);
    }
  `,
  contentVsTemplate: ts`
    <sbu-collapsible label="ng-content">
      <sbu-probe name="proiettato" />  <!-- creato dal padre subito, anche a pannello chiuso -->
    </sbu-collapsible>

    <sbu-collapsible label="ng-template" [lazyContent]="lazy" />
    <ng-template #lazy><sbu-probe name="lazy" /></ng-template>

    // Collapsible
    readonly lazyContent = input<TemplateRef<unknown>>();

    @if (open()) {
      <div [id]="panelId">
        <ng-content />
        @if (lazyContent(); as template) {
          <ng-container [ngTemplateOutlet]="template" />  <!-- nasce all'apertura, muore alla chiusura -->
        }
      </div>
    }
  `,
  structural: ts`
    <sbu-probe *sbuUnless="hideE()" name="E" />

    <!-- desugaring -->
    <ng-template [sbuUnless]="hideE()">
      <sbu-probe name="E" />
    </ng-template>

    // Unless
    constructor() {
      effect(() => {
        const next = this.condition() ? this.elseTemplate() : this.template;
        this.vcr.clear(); // distrugge la embedded view → ngOnDestroy di sbu-probe
        if (next) this.vcr.createEmbeddedView(next);
      });
    }
  `,
  checks: ts`
    // Probe è OnPush, ma questi hook girano a ogni CD del padre
    ngDoCheck(): void {
      this.log.count(\`\${this.name()}: ngDoCheck\`);
    }
    ngAfterContentChecked(): void {
      this.log.count(\`\${this.name()}: ngAfterContentChecked\`);
    }
    ngAfterViewChecked(): void {
      this.log.count(\`\${this.name()}: ngAfterViewChecked\`);
    }

    // LifecycleLog: oggetto semplice, NON signal (signal → CD → hook → signal… = NG0103)
    readonly checks: Record<string, number> = {};
    count(key: string): void {
      this.checks[key] = (this.checks[key] ?? 0) + 1;
    }

    // pagina: copia nel signal solo al click
    readChecks(): void {
      this.checks.set({ ...this.log.checks });
    }
  `,
};

/**
 * Pagina: CICLO DI VITA
 *
 * Tre "creatori" di view, tre momenti di nascita/morte diversi:
 * - template del componente     → nasce/muore con il componente
 * - embedded view (@if, @for, outlet, direttive strutturali) → nasce/muore con la condizione
 * - contenuto proiettato         → nasce/muore con il PADRE che lo scrive, non con chi lo proietta
 */
@Component({
  selector: 'sbu-lifecycle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock, Probe, Collapsible, Unless, KeyValuePipe],
  template: `
    <sbu-lab-page heading="Ciclo di vita">
      <span intro>Ogni esempio scrive nel log in fondo alla pagina. Svuota il log prima di ogni prova.</span>

      <sbu-example [n]="1" title="Creazione e distruzione (@if)">
        <button type="button" class="btn" (click)="showA.set(!showA())">
          {{ showA() ? 'Distruggi' : 'Crea' }} probe A
        </button>
        @if (showA()) {
          <sbu-probe name="A" class="mt-2" />
        }
        <sbu-code [code]="code.creation" />
        <p note>Ordine: constructor → ngOnChanges → ngOnInit → ngAfterContentInit → ngAfterViewInit → afterNextRender.</p>
      </sbu-example>

      <sbu-example [n]="2" title="Cambio input: ngOnChanges vs effect">
        <button type="button" class="btn" (click)="rename()">Rinomina</button>
        <sbu-probe [name]="probeName()" class="mt-2" />
        <sbu-code [code]="code.inputChange" />
        <p note>
          Al cambio input: ngOnChanges (con previousValue) ed effect. ngOnInit NON rigira.
          Con input statici (<code>name="A"</code>) ngOnChanges gira solo la prima volta.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="contentChild vs viewChild" level="intermedio">
        <sbu-probe name="C">
          <em #projected class="block">contenuto proiettato</em>
        </sbu-probe>
        <sbu-code [code]="code.queries" />
        <p note>
          Contenuto proiettato → pronto in ngAfterContentInit. Template del componente → pronto in ngAfterViewInit.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="ng-content vs ng-template: chi nasce quando" level="intermedio">
        <div class="flex flex-col gap-3">
          <sbu-collapsible label="ng-content">
            <sbu-probe name="proiettato" />
          </sbu-collapsible>

          <sbu-collapsible label="ng-template" [lazyContent]="lazy" />
          <ng-template #lazy><sbu-probe name="lazy" /></ng-template>
        </div>
        <sbu-code [code]="code.contentVsTemplate" />
        <p note>
          "proiettato" ha già loggato il constructor con il pannello chiuso e non muore alla chiusura.
          "lazy" nasce all'apertura e muore alla chiusura.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="Embedded view distrutta da una direttiva strutturale" level="avanzato">
        <button type="button" class="btn" (click)="hideE.set(!hideE())">Toggle *sbuUnless</button>
        <sbu-probe *sbuUnless="hideE()" name="E" class="mt-2" />
        <sbu-code [code]="code.structural" />
        <p note><code>vcr.clear()</code> distrugge la embedded view → ngOnDestroy + DestroyRef di tutto il contenuto.</p>
      </sbu-example>

      <sbu-example [n]="6" title="Hook ripetuti e OnPush" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="readChecks()">Click (fa partire un CD) e leggi contatori</button>
        </div>
        <dl class="mt-2 grid grid-cols-[1fr_auto] gap-x-4 text-sm">
          @for (entry of checks() | keyvalue; track entry.key) {
            <dt>{{ entry.key }}</dt>
            <dd class="text-right tabular-nums">{{ entry.value }}</dd>
          }
        </dl>
        <sbu-code [code]="code.checks" />
        <p note>
          Ogni click fa crescere ngDoCheck di tutti i probe anche se sono OnPush e i loro input non cambiano:
          ngDoCheck è chiamato dal padre. Il template OnPush invece non viene ri-renderizzato.
        </p>
      </sbu-example>

      <section aria-labelledby="log-heading" class="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <h2 id="log-heading" class="text-lg font-semibold">Log</h2>
          <button type="button" class="btn" (click)="clear()">Svuota</button>
        </div>
        <ol role="log" class="mt-2 max-h-80 overflow-auto font-mono text-xs" tabindex="0" aria-label="Log hook">
          @for (entry of log.entries(); track $index) {
            <li class="border-b border-border py-0.5">{{ $index + 1 }}. {{ entry }}</li>
          } @empty {
            <li class="text-muted-foreground">Nessun evento.</li>
          }
        </ol>
      </section>
    </sbu-lab-page>
  `,
})
export default class LifecyclePage {
  protected readonly code = CODE;

  protected readonly log = inject(LifecycleLog);

  protected readonly showA = signal(false);
  protected readonly probeName = signal('B');
  protected readonly hideE = signal(false);
  protected readonly checks = signal<Record<string, number>>({});

  private renames = 0;

  protected rename(): void {
    this.probeName.set(`B${++this.renames}`);
  }

  protected readChecks(): void {
    this.checks.set({ ...this.log.checks });
  }

  protected clear(): void {
    this.log.clear();
    this.checks.set({});
  }
}
