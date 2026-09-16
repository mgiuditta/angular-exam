import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  Subject,
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  of,
  scan,
  switchMap,
  timer,
} from 'rxjs';
import { CodeBlock, ts } from '../shared/code-block';
import { fakeSearch } from '../shared/fake-api';
import { Example, LabPage } from '../shared/example';
import { OperatorGroupView } from './operator-group';
import { HELPERS_CODE, OPERATOR_GROUPS } from './operators';

/** Finta richiesta da 1s che risponde con il suo numero. */
const request = (n: number) => timer(1000).pipe(map(() => n));

/** Accumula le risposte in un array, partendo da []. */
const collect = scan<number, number[]>((acc, n) => [...acc, n], []);

const TYPEAHEAD_CODE = ts`
  // componente
  search = new FormControl('', { nonNullable: true });
  results$ = this.search.valueChanges.pipe(
    map((query) => query.trim()),
    debounceTime(300),          // aspetta 300ms di silenzio
    distinctUntilChanged(),     // niente richiesta se il testo non è cambiato
    switchMap((query) =>        // cancella la richiesta precedente
      query.length < 2 ? of([]) : fakeSearch(query).pipe(catchError(() => of([]))),
    ),
  );

  // template
  <input [formControl]="search" />
  @if (results$ | async; as results) {
    @for (name of results; track name) { <li>{{ name }}</li> }
  }
`;

const FLATTENING_CODE = ts`
  const request = (n: number) => timer(1000).pipe(map(() => n));
  const collect = scan<number, number[]>((acc, n) => [...acc, n], []);

  clicks = new Subject<number>();
  switched     = toSignal(this.clicks.pipe(switchMap(request), collect), { initialValue: [] });
  merged       = toSignal(this.clicks.pipe(mergeMap(request), collect), { initialValue: [] });
  concatenated = toSignal(this.clicks.pipe(concatMap(request), collect), { initialValue: [] });
  exhausted    = toSignal(this.clicks.pipe(exhaustMap(request), collect), { initialValue: [] });

  send() {
    this.sent.update((n) => n + 1);
    this.clicks.next(this.sent());
  }
`;

/**
 * Pagina: RXJS
 *
 * Checklist certificazione:
 * - Observable è LAZY e (di solito) COLD: ogni subscribe = nuova esecuzione.
 * - I 4 flattening operator: switchMap (cancella), mergeMap (parallelo), concatMap (coda), exhaustMap (ignora).
 * - Unsubscribe: async pipe, toSignal, takeUntilDestroyed. Gli stream che completano (HttpClient) non lo richiedono.
 * - Errori: un error termina lo stream; catchError va sull'Observable INTERNO per non uccidere l'esterno.
 * - Signal vs RxJS: signal per STATO sincrono, RxJS per EVENTI nel tempo (debounce, cancellazione, retry).
 */
@Component({
  selector: 'sbu-rxjs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, OperatorGroupView, CodeBlock, AsyncPipe, ReactiveFormsModule],
  template: `
    <sbu-lab-page heading="RxJS: operatori">
      <span intro>Clicca un operatore: la console mostra next / error / complete con il tempo trascorso.</span>

      <sbu-example [n]="1" title="Typeahead: debounceTime + distinctUntilChanged + switchMap" level="intermedio">
        <label class="flex flex-col gap-1 text-sm">
          Cerca un'API Angular
          <input class="field" [formControl]="search" placeholder="es. sig, res, after" />
        </label>
        @if (results$ | async; as results) {
          <ul class="mt-2 list-inside list-disc text-sm" aria-live="polite">
            @for (name of results; track name) {
              <li><code>{{ name }}</code></li>
            } @empty {
              <li class="list-none text-muted-foreground">Nessun risultato</li>
            }
          </ul>
        }
        <sbu-code [code]="code.typeahead" />
        <p note>
          La finta API ha latenza casuale: senza <code>switchMap</code> (es. con <code>mergeMap</code>) una risposta
          vecchia potrebbe arrivare DOPO quella nuova e sovrascriverla. <code>catchError</code> sta sull'interno.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="switchMap vs mergeMap vs concatMap vs exhaustMap" level="intermedio">
        <button type="button" class="btn" (click)="send()">Invia richiesta #{{ sent() + 1 }} (dura 1s)</button>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
          <dt>switchMap</dt>
          <dd>{{ switched() }}</dd>
          <dt>mergeMap</dt>
          <dd>{{ merged() }}</dd>
          <dt>concatMap</dt>
          <dd>{{ concatenated() }}</dd>
          <dt>exhaustMap</dt>
          <dd>{{ exhausted() }}</dd>
        </dl>
        <sbu-code [code]="code.flattening" />
        <p note>
          Clicca 3 volte velocemente. switchMap: solo l'ultima. mergeMap: tutte appena pronte. concatMap: tutte, una
          dopo l'altra (3s). exhaustMap: solo la prima.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="Helper usati negli snippet del catalogo">
        <sbu-code [code]="code.helpers" label="Codice degli helper" />
        <p note>Negli esempi seguenti <code>log(...)</code> scrive una riga "log" nella console del demo.</p>
      </sbu-example>

      @for (group of groups; track group.title; let i = $index) {
        <sbu-example [n]="i + 4" [title]="group.title" [level]="group.level">
          <sbu-operator-group [label]="'Operatori: ' + group.title" [demos]="group.demos" />
          <p note>{{ group.note }}</p>
        </sbu-example>
      }
    </sbu-lab-page>
  `,
})
export default class RxjsPage {
  protected readonly groups = OPERATOR_GROUPS;
  protected readonly code = { typeahead: TYPEAHEAD_CODE, flattening: FLATTENING_CODE, helpers: HELPERS_CODE };

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly results$ = this.search.valueChanges.pipe(
    map((query) => query.trim()),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query) => (query.length < 2 ? of([]) : fakeSearch(query).pipe(catchError(() => of([]))))),
  );

  private readonly clicks = new Subject<number>();
  protected readonly sent = signal(0);
  protected readonly switched = toSignal(this.clicks.pipe(switchMap(request), collect), { initialValue: [] });
  protected readonly merged = toSignal(this.clicks.pipe(mergeMap(request), collect), { initialValue: [] });
  protected readonly concatenated = toSignal(this.clicks.pipe(concatMap(request), collect), { initialValue: [] });
  protected readonly exhausted = toSignal(this.clicks.pipe(exhaustMap(request), collect), { initialValue: [] });

  protected send(): void {
    this.sent.update((n) => n + 1);
    this.clicks.next(this.sent());
  }
}
