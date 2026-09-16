import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  JsonPipe,
  KeyValuePipe,
  PercentPipe,
  SlicePipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { interval, map, take } from 'rxjs';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { FilterImpurePipe, FilterPurePipe, pipeCalls } from './filter-pipes';
import { RelativeTimePipe } from './relative-time-pipe';
import { TruncatePipe } from './truncate-pipe';

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

/**
 * Pagina: PIPE
 *
 * Pipe = trasformazione di un valore nel template: `{{ valore | nome: arg1 : arg2 }}`.
 * Checklist certificazione:
 * - pura (default) vs impura: QUANDO gira transform, quante istanze esistono.
 * - precedenza: la pipe lega PIÙ del ternario → `a ? b : c | pipe` = `a ? b : (c | pipe)`.
 *   Per applicarla a tutto: `(a ? b : c) | pipe`.
 * - `async`: sottoscrive, fa markForCheck a ogni valore, fa unsubscribe alla distruzione della view.
 * - pipe vs computed(): stessa idea di memoizzazione; computed per stato del componente,
 *   pipe per formattazioni riusabili in molti template.
 */
@Component({
  selector: 'sbu-pipes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Example,
    LabPage,
    CodeBlock,
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    JsonPipe,
    KeyValuePipe,
    PercentPipe,
    SlicePipe,
    TitleCasePipe,
    TruncatePipe,
    FilterPurePipe,
    FilterImpurePipe,
    RelativeTimePipe,
    UpperCasePipe
  ],
  template: `
    <sbu-lab-page heading="Pipe">
      <span intro>Built-in, custom pure, impure, con DI e timer.</span>

      <sbu-example [n]="1" title="Pipe built-in">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>date</dt>
          <dd>{{ release | date: 'dd/MM/yyyy HH:mm' }}</dd>
          <dt>currency</dt>
          <dd>{{ price | currency: 'EUR' }}</dd>
          <dt>percent</dt>
          <dd>{{ 0.256 | percent: '1.0-1' }}</dd>
          <dt>titlecase</dt>
          <dd>{{ 'angular senior certification' | titlecase | uppercase | slice: 0 : 3}}</dd>
          <dt>slice</dt>
          <dd>{{ fruits() | slice: 0 : 2 }}</dd>
          <dt>json</dt>
          <dd><code>{{ user | json }}</code></dd>
          <dt>keyvalue</dt>
          <dd>
            @for (entry of user | keyvalue; track entry.key) {
              <code class="mr-1">{{ entry.key }}={{ entry.value }}</code>
            }
          </dd>
          <dt>async</dt>
          <dd>{{ countdown$ | async }}</dd>
        </dl>
        <sbu-code [code]="code.builtin" />
        <p note><code>async</code> e <code>keyvalue</code> sono impure; <code>keyvalue</code> ordina per chiave.</p>
      </sbu-example>

      <sbu-example [n]="2" title="Pipe custom pura con argomenti">
        <p>{{ longText | truncate }}</p>
        <p>{{ longText | truncate: 40 : ' [...]' }}</p>
        <p>computed() equivalente: {{ truncatedByComputed() }}</p>
        <sbu-code [code]="code.truncate" />
        <p note>Pura = memoizzata: ricalcola solo se cambiano input o argomenti (confronto ===).</p>
      </sbu-example>

      <sbu-example [n]="3" title="Pura vs impura: mutazione vs nuovo riferimento" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="addMutating()">❌ push (mutazione)</button>
          <button type="button" class="btn" (click)="addImmutable()">✅ nuovo array</button>
          <button type="button" class="btn" (click)="readCalls()">Leggi contatori</button>
        </div>
        <div class="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 class="font-medium">Pura</h3>
            <ul data-testid="pure" class="list-inside list-disc text-sm">
              @for (f of fruits() | filterPure: 'a'; track $index) {
                <li>{{ f }}</li>
              }
            </ul>
          </div>
          <div>
            <h3 class="font-medium">Impura</h3>
            <ul data-testid="impure" class="list-inside list-disc text-sm">
              @for (f of fruits() | filterImpure: 'a'; track $index) {
                <li>{{ f }}</li>
              }
            </ul>
          </div>
        </div>
        <p class="mt-2 text-sm">
          Chiamate transform → pura: {{ calls().pure }}, impura: {{ calls().impure }}
        </p>
        <sbu-code [code]="code.pureVsImpure" />
        <p note>
          Dopo "push" solo la impura mostra il nuovo elemento. Nota come la impura venga chiamata a ogni
          change detection (anche cliccando "Leggi contatori").
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Pipe impura con DI, timer e DestroyRef" level="avanzato">
        <button type="button" class="btn" (click)="showClock.set(!showClock())">
          {{ showClock() ? 'Distruggi' : 'Crea' }} view
        </button>
        @if (showClock()) {
          <p class="mt-2">Pagina aperta: {{ openedAt | relativeTime }}</p>
        }
        <sbu-code [code]="code.relativeTime" />
        <p note>Distruggendo la view l'istanza della pipe muore e <code>DestroyRef</code> ferma il timer.</p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class PipesPage {
  protected readonly code = CODE;

  protected readonly release = new Date(2026, 0, 15, 10, 30);
  protected readonly price = 1499.9;
  protected readonly user = { name: 'Ada', role: 'admin', level: 3 };
  protected readonly longText = 'Le pipe pure vengono rieseguite solo quando cambia il riferimento del valore in ingresso';
  protected readonly openedAt = Date.now();
  protected readonly showClock = signal(true);

  // Observable nel template → async pipe: subscribe/unsubscribe legati alla view.
  protected readonly countdown$ = interval(1000).pipe(
    take(10),
    map((i) => `${9 - i}s`),
  );

  protected readonly truncatedByComputed = computed(() => this.longText.slice(0, 20).trimEnd() + '…');

  // ⚠️ string[] mutabile SOLO per mostrare l'anti-pattern della mutazione.
  protected readonly fruits = signal<string[]>(['mela', 'banana', 'kiwi']);
  protected readonly calls = signal({ ...pipeCalls });

  protected addMutating(): void {
    // Anti-pattern: stesso riferimento → il signal non notifica e la pipe pura non ricalcola.
    // La view si ricontrolla comunque grazie all'evento click (è la impura a "vederlo").
    this.fruits().push(`arancia ${this.fruits().length}`);
  }

  protected addImmutable(): void {
    this.fruits.update((list) => [...list, `papaya ${list.length}`]);
  }

  protected readCalls(): void {
    this.calls.set({ ...pipeCalls });
  }
}
