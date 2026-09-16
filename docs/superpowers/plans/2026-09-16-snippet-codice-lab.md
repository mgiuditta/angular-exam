# Snippet di codice in tutte le pagine del lab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ogni `<sbu-example>` di ogni pagina del lab mostra lo snippet del codice che lo implementa, come già fanno signals, di, forms, http, rendering, routing, typescript e typescript-types.

**Architecture:** Pattern già presente in `src/app/lab/signals/signals.page.ts`: una costante `const CODE = { chiave: ts\`...\` }` nel file della pagina, esposta con `protected readonly code = CODE;`, e `<sbu-code [code]="code.chiave" />` dentro l'esempio, subito prima del `<p note>`. Un test in `pages.spec.ts` fallisce per ogni esempio senza snippet e fa da guardia per il futuro. Nessun componente nuovo.

**Tech Stack:** Angular 21 (standalone, signals, OnPush, zoneless), Vitest via `@angular/build:unit-test`, Tailwind.

**Spec:** nessuna spec separata. Richiesta utente: "metti tutti gli spezzoni codice". Riferimento del pattern: `src/app/lab/signals/signals.page.ts` righe 14, 29-150, 156, 176, 345 e `src/app/lab/shared/code-block.ts`.

## Global Constraints

- Pagine da completare (30 esempi senza snippet): `directives` (6), `pipes` (4), `lifecycle` (6), `templates` (9), `generics` (1), `advanced` (4). Le altre pagine NON vanno toccate.
- Import: `import { CodeBlock, ts } from '../shared/code-block';` e `CodeBlock` nell'array `imports` del `@Component`.
- `const CODE = {...}` va dopo import/tipi/costanti del file e prima del commento JSDoc della pagina. Chiavi in camelCase, indentate di 2 spazi; contenuto degli snippet indentato di 4 spazi (il tag `ts` rimuove l'indentazione comune).
- `protected readonly code = CODE;` è il primo membro della classe della pagina.
- `<sbu-code [code]="code.chiave" />` va allo stesso livello del `<p note>` dell'esempio, subito prima (mai dentro `@if`, `@defer`, `@for`), indentato di 8 spazi.
- **Escaping dentro `ts\`...\`` (obbligatorio):** backtick → `` \` ``; `${` → `\${`; backslash → `\\` (es. regex `\s` si scrive `\\s`). Un `${` non escapato NON dà errore: il tag legge solo `strings[0]` e lo snippet viene troncato in silenzio.
- Gli snippet sono estratti fedeli del sorgente (possono omettere righe, non inventarne). Nessuna modifica di logica, tranne la pulizia di `AutoFocus` nella Task 2.
- Testi e commenti in italiano, come il resto del lab.
- Comando test mirato: `npx ng test --watch=false --include src/app/lab/pages.spec.ts` (verificato: oggi 13 test passano).

---

### Task 1: Test che trova gli esempi senza snippet

**Files:**
- Modify: `src/app/lab/pages.spec.ts:39-59`

**Interfaces:**
- Consumes: selettori `sbu-example` (`shared/example.ts`), `sbu-code` (`shared/code-block.ts`), `sbu-operator-group` (`rxjs/operator-group.ts`, mostra `sbu-code` solo dopo il click su un operatore: vale come snippet presente).
- Produces: `render(page: Type<unknown>)` helper locale al file; test `'%s: ogni esempio ha lo snippet di codice'` usato come verifica da tutte le task seguenti.

- [ ] **Step 1: Sostituire il blocco `describe` con helper + nuovo test**

Sostituire tutto da `describe('Pagine lab', () => {` fino alla fine del file con:

```ts
async function render(page: Type<unknown>) {
  // necessario per i componenti con @defer: le dipendenze lazy vanno risolte prima
  await TestBed.configureTestingModule({
    imports: [page],
    // httpResource: niente rete nei test, un interceptor risponde subito
    providers: [provideHttpClient(withInterceptors([() => of(new HttpResponse({ status: 200, body: {} }))]))],
  }).compileComponents();
  const fixture = TestBed.createComponent(page);
  await fixture.whenStable();
  return fixture;
}

describe('Pagine lab', () => {
  it.each(pages)('%s si renderizza', async (_, page) => {
    const fixture = await render(page);
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBeTruthy();
    // un secondo giro con eventi: click su tutti i bottoni della pagina
    for (const button of fixture.nativeElement.querySelectorAll('button[type="button"]')) {
      (button as HTMLButtonElement).click();
    }
    await fixture.whenStable();
    fixture.destroy();
  });

  // Il catalogo RxJS mostra lo snippet dentro sbu-operator-group, dopo la scelta dell'operatore.
  it.each(pages)('%s: ogni esempio ha lo snippet di codice', async (_, page) => {
    const fixture = await render(page);
    const examples: HTMLElement[] = [...fixture.nativeElement.querySelectorAll('sbu-example')];
    const withoutCode = examples
      .filter((example) => !example.querySelector('sbu-code, sbu-operator-group'))
      .map((example) => example.querySelector('h2')?.textContent?.trim());
    expect(withoutCode).toEqual([]);
    fixture.destroy();
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 6 failed | 20 passed (26)`. Falliscono esattamente `directives`, `pipes`, `templates`, `lifecycle`, `generics`, `advanced: ogni esempio ha lo snippet di codice`; il diff mostra i titoli degli esempi mancanti (es. `"1. Highlight: input con alias + host binding"`). Se fallisce un'altra pagina, fermarsi e segnalarlo.

- [ ] **Step 3: Commit**

```bash
git add src/app/lab/pages.spec.ts
git commit -m "test(lab): require a code snippet in every example"
```

---

### Task 2: Snippet nella pagina Direttive (+ pulizia AutoFocus)

**Files:**
- Modify: `src/app/lab/directives/directives.page.ts`
- Modify: `src/app/lab/directives/auto-focus.ts:23-28`

**Interfaces:**
- Consumes: `CodeBlock`, `ts` da `../shared/code-block`; test della Task 1.
- Produces: chiavi `CODE.highlight`, `hoverClass`, `autoFocus`, `clickOutside`, `tooltip`, `fancyButton`.

- [ ] **Step 1: Pulire `AutoFocus` (iniezione duplicata `lol`) così lo snippet è fedele**

In `auto-focus.ts` sostituire:

```ts
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly lol = inject(ElementRef)

  constructor() {
    afterNextRender(() => this.lol.nativeElement.focus());
  }
```

con:

```ts
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.host.nativeElement.focus());
  }
```

- [ ] **Step 2: Import e costante `CODE`**

Aggiungere dopo `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';`:

```ts
import { CodeBlock, ts } from '../shared/code-block';
```

Inserire dopo l'ultimo import (`import { Tooltip } from './tooltip';`) e prima di `/**`:

```ts
const CODE = {
  highlight: ts`
    @Directive({
      selector: '[sbuHighlight]',
      exportAs: 'sbuHighlight',
      host: { '[style.backgroundColor]': 'color()', '[style.color]': '"#111827"' },
    })
    export class Highlight {
      readonly color = input(DEFAULT_COLOR, {
        alias: 'sbuHighlight', // stesso nome del selettore
        transform: (value: string | undefined) => value || DEFAULT_COLOR, // <p sbuHighlight> passa ''
      });
    }

    <p sbuHighlight>Default</p>
    <p sbuHighlight="#bbf7d0">Valore statico</p>
    <p [sbuHighlight]="color()" #h="sbuHighlight">{{ h.color() }}</p>
  `,
  hoverClass: ts`
    @Directive({
      selector: '[sbuHoverClass]',
      host: {
        '(mouseenter)': 'hovered.set(true)',
        '(mouseleave)': 'hovered.set(false)',
        '(focusin)': 'hovered.set(true)',
        '(focusout)': 'hovered.set(false)',
        '[class]': 'hovered() ? classes() : ""', // si fonde con le classi statiche
      },
    })
    export class HoverClass {
      readonly classes = input(DEFAULT_CLASSES, {
        alias: 'sbuHoverClass',
        transform: (value: string | undefined) => value || DEFAULT_CLASSES,
      });
      readonly hovered = signal(false);
    }
  `,
  autoFocus: ts`
    @Directive({ selector: '[sbuAutoFocus]' })
    export class AutoFocus {
      private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

      constructor() {
        // una volta, dopo che il DOM del browser è scritto (non gira in SSR)
        afterNextRender(() => this.host.nativeElement.focus());
      }
    }

    @if (editing()) {
      <input sbuAutoFocus class="field" />
    }
  `,
  clickOutside: ts`
    @Directive({
      selector: '[sbuClickOutside]',
      host: { '(document:click)': 'onDocumentClick($event)' }, // rimosso alla distruzione
    })
    export class ClickOutside {
      readonly clickOutside = output<void>();
      private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

      protected onDocumentClick(event: Event): void {
        if (!this.host.nativeElement.contains(event.target as Node)) {
          this.clickOutside.emit();
        }
      }
    }

    <div sbuClickOutside (clickOutside)="menuOpen.set(false)">…</div>
  `,
  tooltip: ts`
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
      protected readonly tipId = \`sbu-tooltip-\${nextId++}\`;
      protected readonly visible = signal(false);
      private readonly renderer = inject(Renderer2);
      private readonly document = inject(DOCUMENT);
      private tip: HTMLElement | null = null;

      constructor() {
        // il tooltip vive nel <body>, fuori dal template: senza cleanup resterebbe orfano
        inject(DestroyRef).onDestroy(() => this.hide());
      }

      show(): void {
        if (this.tip) return;
        const tip: HTMLElement = this.renderer.createElement('div');
        this.renderer.setAttribute(tip, 'id', this.tipId);
        this.renderer.setAttribute(tip, 'role', 'tooltip');
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
  `,
  fancyButton: ts`
    @Component({
      selector: 'button[sbuFancy]', // componente su elemento nativo: semantica del <button> intatta
      hostDirectives: [
        { directive: HoverClass, inputs: ['sbuHoverClass: hoverClass'] },
        { directive: Tooltip, inputs: ['sbuTooltip: tooltip'] },
        { directive: ClickOutside },
      ],
      host: { type: 'button', class: 'btn', '[attr.data-hovered]': 'hover.hovered()' },
      template: \`<ng-content />{{ hover.hovered() ? ' ✨' : '' }}\`,
    })
    export class FancyButton {
      protected readonly hover = inject(HoverClass); // stessa istanza della host directive
    }

    <button sbuFancy tooltip="Tooltip da hostDirective" hoverClass="ring-2 ring-info">Fancy</button>
  `,
};

```

- [ ] **Step 3: `imports`, membro `code` e tag nel template**

`imports: [Example, LabPage, Highlight, ...]` → `imports: [Example, LabPage, CodeBlock, Highlight, HoverClass, AutoFocus, ClickOutside, Tooltip, FancyButton],`

Prima riga della classe `DirectivesPage`:

```ts
  protected readonly code = CODE;
```

Inserire (8 spazi di indentazione) subito prima di ciascun `<p note>` indicato:

| Esempio | Prima di | Riga da inserire |
|---|---|---|
| 1 | `<p note>Gli input sono disponibili da` | `<sbu-code [code]="code.highlight" />` |
| 2 | `<p note>I listener <code>host</code>` | `<sbu-code [code]="code.hoverClass" />` |
| 3 | `<p note>Ogni volta che il blocco` | `<sbu-code [code]="code.autoFocus" />` |
| 4 | `<p note>Clicca fuori dal menu` | `<sbu-code [code]="code.clickOutside" />` |
| 5 | `<p note>Il click distrugge l'host` | `<sbu-code [code]="code.tooltip" />` |
| 6 | `<p note>Le host directive nascono` | `<sbu-code [code]="code.fancyButton" />` |

- [ ] **Step 4: Eseguire i test**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 5 failed | 21 passed (26)`; `directives` passa entrambi i test. Poi `npx ng test --watch=false --include src/app/lab/directives/directives.spec.ts` → tutto PASS (verifica AutoFocus).

- [ ] **Step 5: Commit**

```bash
git add src/app/lab/directives/directives.page.ts src/app/lab/directives/auto-focus.ts
git commit -m "feat(lab): show code snippets on directives page"
```

---

### Task 3: Snippet nella pagina Pipe

**Files:**
- Modify: `src/app/lab/pipes/pipes.page.ts`

**Interfaces:**
- Consumes: `CodeBlock`, `ts`; test della Task 1.
- Produces: chiavi `CODE.builtin`, `truncate`, `pureVsImpure`, `relativeTime`.

- [ ] **Step 1: Import e costante `CODE`**

Aggiungere dopo `import { interval, map, take } from 'rxjs';`:

```ts
import { CodeBlock, ts } from '../shared/code-block';
```

Inserire dopo `import { TruncatePipe } from './truncate-pipe';` e prima di `/**`:

```ts
const CODE = {
  builtin: ts`
    {{ release | date: 'dd/MM/yyyy HH:mm' }}
    {{ price | currency: 'EUR' }}
    {{ 0.256 | percent: '1.0-1' }}
    {{ 'angular senior certification' | titlecase | uppercase | slice: 0 : 3 }}  <!-- pipe in catena -->
    {{ fruits() | slice: 0 : 2 }}
    {{ user | json }}
    @for (entry of user | keyvalue; track entry.key) {
      {{ entry.key }}={{ entry.value }}
    }
    {{ countdown$ | async }}

    countdown$ = interval(1000).pipe(
      take(10),
      map((i) => \`\${9 - i}s\`),
    );
  `,
  truncate: ts`
    @Pipe({ name: 'truncate' }) // pure: true di default
    export class TruncatePipe implements PipeTransform {
      transform(value: string | null | undefined, max = 20, suffix = '…'): string {
        if (!value) return '';
        return value.length > max ? value.slice(0, max).trimEnd() + suffix : value;
      }
    }

    {{ longText | truncate }}
    {{ longText | truncate: 40 : ' [...]' }}

    // equivalente con computed()
    truncatedByComputed = computed(() => this.longText.slice(0, 20).trimEnd() + '…');
  `,
  pureVsImpure: ts`
    @Pipe({ name: 'filterPure' }) // ricalcola solo se cambia il riferimento dell'array o la query
    export class FilterPurePipe implements PipeTransform {
      transform(items: readonly string[], query: string): readonly string[] {
        return items.filter(matches(query));
      }
    }

    @Pipe({ name: 'filterImpure', pure: false }) // gira a ogni CD, un'istanza per binding
    export class FilterImpurePipe implements PipeTransform {
      private last: readonly string[] = [];

      transform(items: readonly string[], query: string): readonly string[] {
        const next = items.filter(matches(query));
        const unchanged = next.length === this.last.length && next.every((v, i) => v === this.last[i]);
        return unchanged ? this.last : (this.last = next); // stesso riferimento → niente NG0100
      }
    }

    // ❌ stesso riferimento: la pura non vede il nuovo elemento
    this.fruits().push('arancia');
    // ✅ nuovo array
    this.fruits.update((list) => [...list, 'papaya']);
  `,
  relativeTime: ts`
    @Pipe({ name: 'relativeTime', pure: false })
    export class RelativeTimePipe implements PipeTransform {
      private readonly format = new Intl.RelativeTimeFormat(inject(LOCALE_ID), { numeric: 'auto' });
      private now = Date.now();

      constructor() {
        const cdr = inject(ChangeDetectorRef);
        const id = setInterval(() => {
          this.now = Date.now();
          cdr.markForCheck(); // zoneless: il timer da solo non fa partire il CD
        }, 1000);
        inject(DestroyRef).onDestroy(() => clearInterval(id)); // muore con la view
      }

      transform(value: Date | number): string {
        const seconds = Math.round((+value - this.now) / 1000);
        const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? UNITS[UNITS.length - 1];
        return this.format.format(Math.round(seconds / size), unit);
      }
    }

    @if (showClock()) {
      {{ openedAt | relativeTime }}
    }
  `,
};

```

- [ ] **Step 2: `imports`, membro `code` e tag nel template**

Nell'array `imports`, dopo `LabPage,` aggiungere la riga `    CodeBlock,`.

Prima riga della classe `PipesPage`:

```ts
  protected readonly code = CODE;
```

Inserire (8 spazi) subito prima di ciascun `<p note>` indicato:

| Esempio | Prima di | Riga da inserire |
|---|---|---|
| 1 | `<p note><code>async</code> e <code>keyvalue</code>` | `<sbu-code [code]="code.builtin" />` |
| 2 | `<p note>Pura = memoizzata` | `<sbu-code [code]="code.truncate" />` |
| 3 | `<p note>` seguito dalla riga `Dopo "push" solo la impura` | `<sbu-code [code]="code.pureVsImpure" />` |
| 4 | `<p note>Distruggendo la view` | `<sbu-code [code]="code.relativeTime" />` |

- [ ] **Step 3: Eseguire i test**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 4 failed | 22 passed (26)`; `pipes` passa entrambi. Poi `npx ng test --watch=false --include src/app/lab/pipes/pipes.spec.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/lab/pipes/pipes.page.ts
git commit -m "feat(lab): show code snippets on pipes page"
```

---

### Task 4: Snippet nella pagina Ciclo di vita

**Files:**
- Modify: `src/app/lab/lifecycle/lifecycle.page.ts`

**Interfaces:**
- Consumes: `CodeBlock`, `ts`; test della Task 1.
- Produces: chiavi `CODE.creation`, `inputChange`, `queries`, `contentVsTemplate`, `structural`, `checks`.

- [ ] **Step 1: Import e costante `CODE`**

Aggiungere dopo `import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';`:

```ts
import { CodeBlock, ts } from '../shared/code-block';
```

Inserire dopo `import { Probe } from './probe';` e prima di `/**`:

```ts
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

```

- [ ] **Step 2: `imports`, membro `code` e tag nel template**

`imports: [Example, LabPage, Probe, Collapsible, Unless, KeyValuePipe],` → `imports: [Example, LabPage, CodeBlock, Probe, Collapsible, Unless, KeyValuePipe],`

Prima riga della classe `LifecyclePage` (sopra `protected readonly log = inject(LifecycleLog);`):

```ts
  protected readonly code = CODE;
```

Inserire (8 spazi) subito prima di ciascun `<p note>` indicato. Non toccare la `<section aria-labelledby="log-heading">`.

| Esempio | Prima di | Riga da inserire |
|---|---|---|
| 1 | `<p note>Ordine: constructor` | `<sbu-code [code]="code.creation" />` |
| 2 | `<p note>` seguito da `Al cambio input: ngOnChanges` | `<sbu-code [code]="code.inputChange" />` |
| 3 | `<p note>` seguito da `Contenuto proiettato → pronto` | `<sbu-code [code]="code.queries" />` |
| 4 | `<p note>` seguito da `"proiettato" ha già loggato` | `<sbu-code [code]="code.contentVsTemplate" />` |
| 5 | `<p note><code>vcr.clear()</code>` | `<sbu-code [code]="code.structural" />` |
| 6 | `<p note>` seguito da `Ogni click fa crescere ngDoCheck` | `<sbu-code [code]="code.checks" />` |

- [ ] **Step 3: Eseguire i test**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 3 failed | 23 passed (26)`; `lifecycle` passa entrambi. Poi `npx ng test --watch=false --include src/app/lab/lifecycle/lifecycle.spec.ts` → PASS (il test potrebbe contare elementi/bottoni della pagina: se fallisce per questo, fermarsi e segnalarlo).

- [ ] **Step 4: Commit**

```bash
git add src/app/lab/lifecycle/lifecycle.page.ts
git commit -m "feat(lab): show code snippets on lifecycle page"
```

---

### Task 5: Snippet nella pagina Template

**Files:**
- Modify: `src/app/lab/templates/templates.page.ts`

**Interfaces:**
- Consumes: `CodeBlock`, `ts`; test della Task 1.
- Produces: chiavi `CODE.ngContainer`, `templateOutlet`, `outletContext`, `cardList`, `componentOutlet`, `unless`, `repeat`, `delay`, `tabs`.

- [ ] **Step 1: Import e costante `CODE`**

Aggiungere dopo `import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';`:

```ts
import { CodeBlock, ts } from '../shared/code-block';
```

Inserire dopo l'`interface User { ... }` e prima di `/**`:

```ts
const CODE = {
  ngContainer: ts`
    <dl>
      @for (user of users(); track user.id) {
        <ng-container>  <!-- nel DOM diventa un commento: dt/dd restano figli diretti di <dl> -->
          <dt>#{{ user.id }}</dt>
          <dd>{{ user.name }}</dd>
        </ng-container>
      }
    </dl>

    <ng-container ngProjectAs="[note]">
      <p>Proiettato nello slot [note]</p>
    </ng-container>
  `,
  templateOutlet: ts`
    <ng-template #spinner>
      <span role="status">⏳ Caricamento…</span>
    </ng-template>

    @if (loaded()) {
      <span>Sezione A pronta</span>
    } @else {
      <ng-container [ngTemplateOutlet]="spinner" />  <!-- forma a binding -->
    }

    @if (loaded()) {
      <span>Sezione B pronta</span>
    } @else {
      <ng-container *ngTemplateOutlet="spinner" />   <!-- forma strutturale -->
    }
  `,
  outletContext: ts`
    <ng-template #row let-user let-position="position" let-total="total">
      <li>{{ position }}/{{ total }} — {{ user.name }}</li>
    </ng-template>

    <ul>
      @for (user of users(); track user.id; let i = $index) {
        <ng-container
          *ngTemplateOutlet="row; context: { $implicit: user, position: i + 1, total: users().length }"
        />
      }
    </ul>
  `,
  cardList: ts`
    export class CardList<T> {
      readonly items = input.required<readonly T[]>();
      readonly itemTemplate = input<TemplateRef<ItemContext<T>>>();
      private readonly projected = contentChild<TemplateRef<ItemContext<T>>>(TemplateRef);
      protected readonly template = computed(() => this.itemTemplate() ?? this.projected());
    }

    <!-- template di CardList -->
    @for (item of items(); track $index) {
      <ng-container
        [ngTemplateOutlet]="template() ?? defaultTemplate"
        [ngTemplateOutletContext]="{ $implicit: item, index: $index }"
      />
    }
    <ng-template #defaultTemplate let-item let-i="index">{{ i + 1 }}. {{ item }}</ng-template>

    <!-- A) template via input -->
    <sbu-card-list [items]="names()" [itemTemplate]="badge" />
    <ng-template #badge let-name><span>{{ name }}</span></ng-template>

    <!-- B) template proiettato -->
    <sbu-card-list [items]="names()">
      <ng-template let-name let-i="index">
        <strong>{{ name }}</strong> {{ i === selectedIndex() ? '← selezionato' : '' }}
      </ng-template>
    </sbu-card-list>
  `,
  componentOutlet: ts`
    alertComponent = computed(() => (this.warning() ? WarningAlert : InfoAlert));
    alertMessage = computed(() => (this.warning() ? 'Spazio quasi esaurito' : 'Backup completato'));

    <ng-container *ngComponentOutlet="alertComponent(); inputs: { message: alertMessage() }" />

    @Component({
      selector: 'sbu-info-alert',
      template: \`<p role="status">ℹ️ {{ message() }}</p>\`,
    })
    export class InfoAlert {
      readonly message = input.required<string>(); // stessa API di WarningAlert
    }
  `,
  unless: ts`
    <p *sbuUnless="loggedIn(); else welcome">Effettua il login per continuare.</p>
    <ng-template #welcome><p>Bentornato 👋</p></ng-template>

    @Directive({ selector: '[sbuUnless]' })
    export class Unless {
      readonly condition = input.required<boolean>({ alias: 'sbuUnless' });
      readonly elseTemplate = input<TemplateRef<unknown> | null>(null, { alias: 'sbuUnlessElse' }); // "; else x"

      private readonly template = inject(TemplateRef);
      private readonly vcr = inject(ViewContainerRef);

      constructor() {
        effect(() => {
          const next = this.condition() ? this.elseTemplate() : this.template;
          this.vcr.clear();
          if (next) this.vcr.createEmbeddedView(next);
        });
      }
    }
  `,
  repeat: ts`
    <li *sbuRepeat="let user of users(); trackBy: byId; index as i; first as isFirst; last as isLast">
      {{ i }}. {{ user.name }}
    </li>

    byId = (user: User) => user.id;

    export interface RepeatContext<T> {
      $implicit: T;  // let user
      index: number; // index as i
      count: number;
      first: boolean;
      last: boolean;
    }

    @Directive({ selector: '[sbuRepeat]' })
    export class Repeat<T> {
      readonly items = input.required<readonly T[]>({ alias: 'sbuRepeatOf' }); // of users()
      readonly trackBy = input<(item: T) => unknown>((item) => item, { alias: 'sbuRepeatTrackBy' }); // trackBy: byId

      private readonly template = inject<TemplateRef<RepeatContext<T>>>(TemplateRef);
      private readonly vcr = inject(ViewContainerRef);
      private views = new Map<unknown, EmbeddedViewRef<RepeatContext<T>>>();

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
              this.vcr.move(reused, index); // spostata, non ricreata: lo stato DOM sopravvive
              next.set(key, reused);
            } else {
              next.set(key, this.vcr.createEmbeddedView(this.template, context, index));
            }
          });

          this.views.forEach((view) => view.destroy()); // chiavi sparite
          this.views = next;
        });
      }

      // user tipizzato come T invece di any
      static ngTemplateContextGuard<T>(_dir: Repeat<T>, _ctx: unknown): _ctx is RepeatContext<T> {
        return true;
      }
    }
  `,
  delay: ts`
    @for (run of [delayRun()]; track run) {
      <p *sbuDelay="1500">Comparso dopo 1.5s (run {{ run }})</p>
    }

    @Directive({ selector: '[sbuDelay]' })
    export class Delay {
      readonly ms = input.required({ alias: 'sbuDelay', transform: numberAttribute });
      private readonly template = inject(TemplateRef);
      private readonly vcr = inject(ViewContainerRef);

      constructor() {
        effect((onCleanup) => {
          const id = setTimeout(() => this.vcr.createEmbeddedView(this.template), this.ms());
          onCleanup(() => {
            // input cambiato o direttiva distrutta
            clearTimeout(id);
            this.vcr.clear();
          });
        });
      }
    }
  `,
  tabs: ts`
    <sbu-tabs>
      <ng-template><p>Contenuto tab 1</p></ng-template>
      <ng-template><p>Contenuto tab 2 — creato solo quando selezionato</p></ng-template>
    </sbu-tabs>

    @Component({
      selector: 'sbu-tabs',
      template: \`
        <div role="tablist">
          @for (tpl of templates(); track $index) {
            <button type="button" role="tab" [attr.aria-selected]="$index === active()" (click)="active.set($index)">
              Tab {{ $index + 1 }}
            </button>
          }
        </div>
        <div role="tabpanel"><ng-container #outlet /></div>
      \`,
    })
    export class Tabs {
      protected readonly templates = contentChildren(TemplateRef);
      private readonly outlet = viewChild('outlet', { read: ViewContainerRef }); // senza read → ElementRef
      protected readonly active = signal(0);

      constructor() {
        effect(() => {
          const vcr = this.outlet();
          const tpl = this.templates()[this.active()];
          if (!vcr) return;
          vcr.clear();
          if (tpl) vcr.createEmbeddedView(tpl);
        });
      }
    }
  `,
};

```

- [ ] **Step 2: `imports`, membro `code` e tag nel template**

`imports: [Example, LabPage, NgTemplateOutlet, ...]` → `imports: [Example, LabPage, CodeBlock, NgTemplateOutlet, NgComponentOutlet, CardList, Unless, Repeat, Delay, Tabs],`

Prima riga della classe `TemplatesPage`:

```ts
  protected readonly code = CODE;
```

Inserire (8 spazi) subito prima dell'elemento indicato:

| Esempio | Prima di | Riga da inserire |
|---|---|---|
| 1 | `<ng-container ngProjectAs="[note]">` | `<sbu-code [code]="code.ngContainer" />` |
| 2 | `<p note>` seguito da `Stesso template, due embedded view` | `<sbu-code [code]="code.templateOutlet" />` |
| 3 | `<p note>` seguito da `<code>let-user</code> riceve` | `<sbu-code [code]="code.outletContext" />` |
| 4 | `<p note>Il template è valutato nel contesto` | `<sbu-code [code]="code.cardList" />` |
| 5 | `<p note>` seguito da `Cambiare il tipo distrugge` | `<sbu-code [code]="code.componentOutlet" />` |
| 6 | `<p note>Desugaring:` | `<sbu-code [code]="code.unless" />` |
| 7 | `<p note>` seguito da `Scrivi negli input e premi "Inverti"` | `<sbu-code [code]="code.repeat" />` |
| 8 | `<p note>` seguito da `<code>track run</code> cambia` | `<sbu-code [code]="code.delay" />` |
| 9 | `<p note>` seguito da `<code>&lt;ng-content&gt;</code> non è un'ancora` | `<sbu-code [code]="code.tabs" />` |

- [ ] **Step 3: Eseguire i test**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 2 failed | 24 passed (26)`; `templates` passa entrambi. Poi `npx ng test --watch=false --include src/app/lab/templates/templates.spec.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/lab/templates/templates.page.ts
git commit -m "feat(lab): show code snippets on templates page"
```

---

### Task 6: Snippet nella pagina Generici

**Files:**
- Modify: `src/app/lab/generics/generics.page.ts`

**Interfaces:**
- Consumes: `CodeBlock`, `ts`; test della Task 1.
- Produces: chiavi `CODE.searchSelect`, `highlightMatch` (due blocchi nello stesso esempio).

- [ ] **Step 1: Import e costante `CODE`**

Aggiungere dopo `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';`:

```ts
import { CodeBlock, ts } from '../shared/code-block';
```

Inserire dopo la costante `USERS` e prima di `/**`:

```ts
const CODE = {
  searchSelect: ts`
    <sbu-search-select [items]="users" key="name" label="Utente" [(selected)]="selectedUser" />
    <!-- key="nome" → errore di compilazione: 'nome' non è keyof User -->

    export class SearchSelect<T> {
      readonly items = input.required<readonly T[]>(); // T inferito da [items]
      readonly key = input.required<keyof T>();        // solo chiavi di T
      readonly label = input.required<string>();
      readonly selected = model<T>();                  // [(selected)]

      protected readonly query = signal('');

      protected readonly options = computed<Option<T>[]>(() => {
        const words = this.query().toLowerCase().split(/\\s+/).filter(Boolean);
        return this.items()
          .map((item) => ({ item, label: String(item[this.key()]) }))
          .filter(({ label }) => words.every((word) => label.toLowerCase().includes(word)));
      });

      // torna alla prima opzione ogni volta che cambiano i risultati
      protected readonly active = linkedSignal(() => {
        this.options();
        return 0;
      });
    }
  `,
  highlightMatch: ts`
    @Pipe({ name: 'highlightMatch' })
    export class HighlightMatchPipe implements PipeTransform {
      transform(text: string, query: string): TextPart[] {
        const words = query
          .trim()
          .split(/\\s+/)
          .filter(Boolean)
          .map(escapeRegExp)
          .sort((a, b) => b.length - a.length);
        if (!words.length) return [{ text, match: false }];

        // gruppo di cattura: i separatori restano, indici dispari = match
        return text
          .split(new RegExp(\`(\${words.join('|')})\`, 'gi'))
          .map((part, i) => ({ text: part, match: i % 2 === 1 }))
          .filter((part) => part.text);
      }
    }

    @for (part of option.label | highlightMatch: query(); track $index) {
      @if (part.match) {
        <mark>{{ part.text }}</mark>
      } @else {
        {{ part.text }}
      }
    }
  `,
};

```

- [ ] **Step 2: `imports`, membro `code` e tag nel template**

`imports: [Example, LabPage, SearchSelect],` → `imports: [Example, LabPage, CodeBlock, SearchSelect],`

Prima riga della classe `GenericsPage`:

```ts
  protected readonly code = CODE;
```

Subito prima del `<p note>` seguito da `T è inferito da`, inserire (8 spazi):

```html
        <sbu-code [code]="code.searchSelect" label="Codice di SearchSelect" />
        <sbu-code [code]="code.highlightMatch" label="Codice della pipe highlightMatch" />
```

- [ ] **Step 3: Eseguire i test**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 1 failed | 25 passed (26)`; `generics` passa entrambi. Poi `npx ng test --watch=false --include src/app/lab/generics/generics.spec.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/lab/generics/generics.page.ts
git commit -m "feat(lab): show code snippets on generics page"
```

---

### Task 7: Snippet nella pagina Pattern avanzati

**Files:**
- Modify: `src/app/lab/advanced/advanced.page.ts`

**Interfaces:**
- Consumes: `CodeBlock`, `ts`; test della Task 1.
- Produces: chiavi `CODE.tabs`, `createComponent`, `requireRole`, `letDefer`.

- [ ] **Step 1: Import e costante `CODE`**

Aggiungere dopo la chiusura dell'import multi-riga da `'@angular/core'` (`} from '@angular/core';`):

```ts
import { CodeBlock, ts } from '../shared/code-block';
```

Inserire dopo `import { Tab, Tabs } from './tabs';` e prima di `/**`:

```ts
const CODE = {
  tabs: ts`
    <sbu-tabs label="Impostazioni account" [(active)]="activeTab">
      <ng-template sbuTab="Profilo">…</ng-template>
      <ng-template sbuTab="Sicurezza">…</ng-template>
    </sbu-tabs>

    @Directive({ selector: 'ng-template[sbuTab]' }) // solo su ng-template → TemplateRef sempre presente
    export class Tab {
      readonly label = input.required<string>({ alias: 'sbuTab' });
      readonly template = inject(TemplateRef);
    }

    export class Tabs {
      readonly label = input.required<string>();
      readonly active = model(0); // [(active)]
      protected readonly tabs = contentChildren(Tab);
      protected readonly current = computed(() => this.tabs()[this.active()]);
    }

    <!-- template di Tabs -->
    @for (tab of tabs(); track tab; let i = $index) {
      <button type="button" role="tab" [attr.aria-selected]="i === active()"
              [tabIndex]="i === active() ? 0 : -1" (click)="active.set(i)">
        {{ tab.label() }}
      </button>
    }
    @if (current(); as tab) {
      <div role="tabpanel" tabindex="0">
        <ng-container [ngTemplateOutlet]="tab.template" />  <!-- cambio tab = view distrutta -->
      </div>
    }
  `,
  createComponent: ts`
    <button type="button" class="btn" (click)="openDialog()">Elimina progetto…</button>
    <ng-container #dialogHost />

    private readonly dialogHost = viewChild.required('dialogHost', { read: ViewContainerRef });

    openDialog(): void {
      this.dialogHost().clear();
      const ref = this.dialogHost().createComponent(ConfirmDialog, {
        bindings: [
          inputBinding('title', () => \`Eliminare il progetto? (ruolo: \${this.role()})\`), // reattivo
          outputBinding<boolean>('closed', (confirmed) => {
            this.answer.set(confirmed ? 'confermato' : 'annullato');
            ref.destroy();
          }),
        ],
      });
    }

    // ConfirmDialog: <dialog> nativo → focus trap, Esc e backdrop li gestisce il browser
    constructor() {
      afterNextRender(() => this.dialog().nativeElement.showModal?.());
    }
  `,
  requireRole: ts`
    export const CURRENT_ROLE = new InjectionToken<WritableSignal<Role>>('CURRENT_ROLE');

    // AdvancedPage
    providers: [{ provide: CURRENT_ROLE, useFactory: () => signal<Role>('guest') }],

    @Directive({ selector: '[sbuRequireRole]' })
    export class RequireRole {
      readonly required = input.required<Role>({ alias: 'sbuRequireRole' });
      private readonly role = inject(CURRENT_ROLE);
      private readonly allowed = computed(() => RANK[this.role()] >= RANK[this.required()]);

      constructor() {
        const template = inject(TemplateRef, { optional: true }); // presente solo con *

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

    <button type="button" sbuRequireRole="admin">Elimina (admin)</button>
    <span *sbuRequireRole="'admin'">🔐 Pannello admin visibile</span>
  `,
  letDefer: ts`
    @let current = role();
    @let canSeeReport = current !== 'guest';
    <p>Ruolo: {{ current }} — report {{ canSeeReport ? 'consentito' : 'negato' }}</p>

    @if (canSeeReport) {
      @defer (on interaction; prefetch on idle) {
        <sbu-heavy-report />  <!-- chunk separato: HeavyReport è usato solo qui -->
      } @placeholder {
        <button type="button" class="btn">Carica report</button>
      } @loading (after 100ms; minimum 300ms) {
        <p role="status">Caricamento…</p>
      }
    }
  `,
};

```

- [ ] **Step 2: `imports`, membro `code` e tag nel template**

`imports: [Example, LabPage, Tabs, Tab, RequireRole, HeavyReport],` → `imports: [Example, LabPage, CodeBlock, Tabs, Tab, RequireRole, HeavyReport],`

Prima riga della classe `AdvancedPage` (sopra `protected readonly role = inject(CURRENT_ROLE);`):

```ts
  protected readonly code = CODE;
```

Inserire (8 spazi) subito prima di ciascun `<p note>` indicato. Per l'esempio 4 la riga va fuori dal blocco `@if (canSeeReport)`.

| Esempio | Prima di | Riga da inserire |
|---|---|---|
| 1 | `<p note>` seguito da `Tab attivo (two-way con model)` | `<sbu-code [code]="code.tabs" />` |
| 2 | `<p note>` seguito da `<code>ViewContainerRef.createComponent</code>` | `<sbu-code [code]="code.createComponent" />` |
| 3 | `<p note>` seguito da `Stessa direttiva: sui bottoni` | `<sbu-code [code]="code.requireRole" />` |
| 4 | `<p note>` seguito da `<code>&#64;let</code> è read-only` | `<sbu-code [code]="code.letDefer" />` |

- [ ] **Step 3: Eseguire i test**

Run: `npx ng test --watch=false --include src/app/lab/pages.spec.ts`
Expected: `Tests 26 passed (26)`. Poi `npx ng test --watch=false --include src/app/lab/advanced/advanced.spec.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/lab/advanced/advanced.page.ts
git commit -m "feat(lab): show code snippets on advanced page"
```

---

### Task 8: Verifica finale

**Files:** nessuna modifica.

**Interfaces:**
- Consumes: tutte le task precedenti.
- Produces: suite verde e build ok.

- [ ] **Step 1: Suite completa**

Run: `npx ng test --watch=false`
Expected: tutti i file di test PASS, 0 failed.

- [ ] **Step 2: Build di produzione**

Run: `npx ng build`
Expected: `Application bundle generation complete.` senza errori di template/type-check (conferma che i `ts\`...\`` sono escapati bene).

- [ ] **Step 3: Controllo a occhio degli escape**

Run: `npx ng serve`, aprire `/templates`, `/lifecycle`, `/generics`, `/advanced`. Verificare che gli snippet `tabs` (template), `inputChange` (lifecycle), `searchSelect`/`highlightMatch` (generics) e `createComponent` (advanced) finiscano con l'ultima riga attesa (non troncati a un `${`) e che le regex mostrino `\s+`.
Expected: nessuno snippet troncato, backtick e `${` visibili come testo.

- [ ] **Step 4: Nessun commit** (nessuna modifica in questa task).
