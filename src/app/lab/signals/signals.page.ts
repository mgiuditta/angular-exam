import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  linkedSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, interval, map, of, switchMap, take, timer } from 'rxjs';
import { CodeBlock, ts } from '../shared/code-block';
import { fakeFetchUser, fakeSearch } from '../shared/fake-api';
import { Example, LabPage } from '../shared/example';

interface Post {
  readonly id: number;
  readonly title: string;
}

const CATALOG = {
  frutta: ['mela', 'pomodoro', 'kiwi'],
  verdura: ['carota', 'pomodoro', 'zucchina'],
} as const;
type Category = keyof typeof CATALOG;

const CODE = {
  signals: ts`
    count = signal(0);
    double = computed(() => this.count() * 2);
    parity = computed(() => (this.count() % 2 === 0 ? 'pari' : 'dispari'));
    decade = computed(
      () => {
        const start = Math.floor(this.count() / 10) * 10;
        return { start, label: \`\${start}–\${start + 9}\` };
      },
      { equal: (a, b) => a.start === b.start }, // nuovo oggetto, ma notifica solo se cambia start
    );

    this.count.update((n) => n + 1);
    this.count.set(0);
    readonly countReadonly = this.count.asReadonly(); // Signal<number>, senza set/update
  `,
  effect: ts`
    label = signal('contatore');
    effectLog = signal<readonly string[]>([]);

    constructor() {
      effect(() => {
        // count() è una dipendenza, label no
        const line = \`count = \${this.count()} · etichetta = "\${untracked(this.label)}"\`;
        this.effectLog.update((log) => [...log, line]);
      });
    }
  `,
  linkedSignal: ts`
    category = signal<'frutta' | 'verdura'>('frutta');
    options = computed(() => CATALOG[this.category()]);

    // forma estesa: accesso al valore precedente
    choice = linkedSignal<readonly string[], string>({
      source: this.options,
      computation: (options, previous) =>
        previous && options.includes(previous.value) ? previous.value : options[0],
    });

    // forma breve: si resetta a ogni cambio delle dipendenze lette
    quantity = linkedSignal(() => {
      this.category();
      return 1;
    });

    this.choice.set('kiwi'); // scrivibile come un signal
  `,
  resource: ts`
    userId = signal<number | undefined>(1);
    user = resource({
      params: () => this.userId(),                 // undefined → idle, loader non chiamato
      loader: ({ params, abortSignal }) => fakeFetchUser(params, abortSignal),
    });

    // template
    @if (user.error(); as error) {
      {{ error.message }}
    } @else if (user.hasValue()) {
      {{ user.value().name }}                      <!-- value() in errore lancerebbe -->
    }

    this.user.reload();
    this.user.set({ id: 0, name: 'Modificato in locale' }); // status → 'local'
  `,
  rxResource: ts`
    countdownFrom = signal(3);
    countdown = rxResource({
      params: () => this.countdownFrom(),
      stream: ({ params }) =>
        timer(0, 400).pipe(
          take(params + 1),
          map((i) => params - i),
        ),
    });
  `,
  httpResource: ts`
    // app.config.ts
    providers: [provideHttpClient(withFetch())]

    postId = signal(1);
    post = httpResource<Post>(() => \`https://jsonplaceholder.typicode.com/posts/\${this.postId()}\`);

    // anche con oggetto request e parse:
    // httpResource(() => ({ url, method: 'GET', params: { q } }), { parse: PostSchema.parse })

    // template
    {{ post.status() }} {{ post.statusCode() }}
    @if (post.hasValue()) { {{ post.value().title }} }
  `,
  interop: ts`
    query = signal('');
    searchResults = toSignal(
      toObservable(this.query).pipe(               // Signal → Observable
        map((q) => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => (q.length < 2 ? of([]) : fakeSearch(q))),
      ),
      { initialValue: [] },                        // Observable → Signal
    );

    seconds = toSignal(interval(1000), { initialValue: 0 });

    aliveSeconds = signal(0);
    constructor() {
      interval(1000)
        .pipe(takeUntilDestroyed())                // unsubscribe alla distruzione del componente
        .subscribe(() => this.aliveSeconds.update((n) => n + 1));
    }
  `,
};

/**
 * Pagina: SIGNAL E RESOURCE
 *
 * Checklist certificazione:
 * - signal (scrivibile) → computed (derivato, lazy e memoizzato) → effect (side effect, gira in microtask).
 * - linkedSignal: derivato MA scrivibile; si resetta quando cambia la sorgente.
 * - resource/rxResource/httpResource: stato ASINCRONO come signal (value, status, error, isLoading, hasValue).
 *   Cambiare i params annulla il caricamento precedente (abortSignal / unsubscribe).
 * - value() in stato 'error' LANCIA: controlla prima hasValue() o error().
 * - Interop: toSignal (Observable → Signal, subscribe immediato), toObservable (Signal → Observable, via effect).
 */
@Component({
  selector: 'sbu-signals-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock],
  template: `
    <sbu-lab-page heading="Signal e resource">
      <span intro>Dallo stato sincrono (signal, computed, linkedSignal) a quello asincrono (resource).</span>

      <sbu-example [n]="1" title="signal, computed, asReadonly">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="count.update(increment)">+1</button>
          <button type="button" class="btn" (click)="count.set(0)">Reset</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>count()</dt>
          <dd>{{ count() }}</dd>
          <dt>double (computed)</dt>
          <dd>{{ double() }}</dd>
          <dt>parity (computed)</dt>
          <dd>{{ parity() }}</dd>
          <dt>decade (equal custom)</dt>
          <dd>{{ decade().label }}</dd>
        </dl>
        <sbu-code [code]="code.signals" />
        <p note>
          <code>computed</code> è lazy e memoizzato: ricalcola solo se una dipendenza letta è cambiata.
          <code>equal</code> decide se notificare: <code>decade</code> crea un oggetto nuovo a ogni click ma notifica solo
          quando cambia la decina. Esponi <code>count.asReadonly()</code> dai servizi.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="effect + untracked">
        <div class="flex flex-wrap items-end gap-2">
          <button type="button" class="btn" (click)="count.update(increment)">count +1</button>
          <label class="flex flex-col gap-1 text-sm">
            Etichetta (untracked)
            <input #labelInput class="field" [value]="label()" (input)="label.set(labelInput.value)" />
          </label>
        </div>
        <ol role="log" class="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          @for (line of effectLog(); track $index) {
            <li>{{ line }}</li>
          }
        </ol>
        <sbu-code [code]="code.effect" />
        <p note>
          L'effect legge <code>count()</code> (dipendenza) e <code>untracked(label)</code> (NON dipendenza): scrivere
          nell'etichetta non lo riesegue. Più set nello stesso tick = una sola esecuzione.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="linkedSignal: derivato ma scrivibile" level="intermedio">
        <fieldset class="flex flex-wrap gap-3 text-sm">
          <legend class="mb-1 font-medium">Categoria</legend>
          @for (c of categories; track c) {
            <label class="flex items-center gap-1">
              <input type="radio" name="category" [value]="c" [checked]="category() === c" (change)="category.set(c)" />
              {{ c }}
            </label>
          }
        </fieldset>
        <div class="mt-3 flex flex-wrap items-end gap-2">
          <label class="flex flex-col gap-1 text-sm">
            Prodotto
            <select #choiceSelect class="field" [value]="choice()" (change)="choice.set(choiceSelect.value)">
              @for (option of options(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          </label>
          <button type="button" class="btn" (click)="quantity.update(increment)">Quantità: {{ quantity() }}</button>
        </div>
        <sbu-code [code]="code.linkedSignal" />
        <p note>
          Forma estesa <code>{{ '{' }} source, computation(src, previous) {{ '}' }}</code>: cambiando categoria mantiene la
          scelta se esiste ancora ("pomodoro"), altrimenti torna al primo. Forma breve
          <code>linkedSignal(() =&gt; …)</code>: la quantità torna a 1 a ogni cambio categoria.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="resource: Promise + abortSignal" level="intermedio">
        <div class="flex flex-wrap gap-2">
          @for (id of userIds; track id) {
            <button type="button" class="btn" [attr.aria-pressed]="userId() === id" (click)="userId.set(id)">
              Utente {{ id }}
            </button>
          }
          <button type="button" class="btn" (click)="userId.set(99)">Utente 99 (errore)</button>
          <button type="button" class="btn" (click)="userId.set(undefined)">Nessuno (idle)</button>
          <button type="button" class="btn" (click)="user.reload()">reload()</button>
          <button type="button" class="btn" (click)="user.set({ id: 0, name: 'Modificato in locale' })">set()</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>status()</dt>
          <dd><code>{{ user.status() }}</code></dd>
          <dt>isLoading()</dt>
          <dd>{{ user.isLoading() }}</dd>
          <dt>value()</dt>
          <dd>
            @if (user.error(); as error) {
              <span class="text-destructive">error(): {{ error.message }}</span>
            } @else if (user.hasValue()) {
              {{ user.value().name }}
            } @else {
              <span class="text-muted-foreground">undefined</span>
            }
          </dd>
        </dl>
        <sbu-code [code]="code.resource" />
        <p note>
          <code>params</code> è un computed: se cambia, il loader precedente riceve abort. <code>undefined</code> →
          <code>idle</code> senza chiamare il loader. Durante il reload il value precedente resta visibile
          (<code>reloading</code>). <code>set()</code> → stato <code>local</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="rxResource: stream Observable" level="intermedio">
        <div class="flex flex-wrap gap-2">
          @for (from of countdowns; track from) {
            <button type="button" class="btn" (click)="countdownFrom.set(from)">Da {{ from }}</button>
          }
          <button type="button" class="btn" (click)="countdown.reload()">reload()</button>
        </div>
        <p class="mt-3 text-sm" aria-live="polite">
          <code>{{ countdown.status() }}</code> → {{ countdown.hasValue() ? countdown.value() : '…' }}
        </p>
        <sbu-code [code]="code.rxResource" />
        <p note>
          <code>stream</code> restituisce un Observable: ogni next aggiorna <code>value()</code>. Cambiando params
          fa unsubscribe del precedente (come switchMap). Senza RxJS: <code>resource({{ '{' }} stream {{ '}' }})</code>
          con un signal di <code>{{ '{' }} value {{ '}' }}</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="httpResource: HttpClient come signal" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" [disabled]="postId() === 1" (click)="postId.update(decrement)">◀ Post</button>
          <button type="button" class="btn" (click)="postId.update(increment)">Post ▶</button>
          <button type="button" class="btn" (click)="postId.set(0)">Post 0 (404)</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>status()</dt>
          <dd><code>{{ post.status() }}</code></dd>
          <dt>statusCode()</dt>
          <dd>{{ post.statusCode() ?? '—' }}</dd>
          <dt>value()</dt>
          <dd>
            @if (post.error()) {
              <span class="text-destructive">errore HTTP</span>
            } @else if (post.hasValue()) {
              #{{ post.value().id }} {{ post.value().title }}
            } @else {
              …
            }
          </dd>
        </dl>
        <sbu-code [code]="code.httpResource" />
        <p note>
          <code>httpResource(() =&gt; url)</code>: passa per HttpClient (interceptor inclusi), richiede
          <code>provideHttpClient()</code>. Solo per LETTURE: per POST/PUT usa HttpClient. Varianti
          <code>httpResource.text/blob/arrayBuffer</code>, opzione <code>parse</code> per validare (es. Zod).
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="Interop: toSignal, toObservable, takeUntilDestroyed" level="avanzato">
        <label class="flex flex-col gap-1 text-sm">
          Cerca un'API (signal → debounce → signal)
          <input #queryInput class="field" [value]="query()" (input)="query.set(queryInput.value)" />
        </label>
        <p class="mt-2 text-sm" aria-live="polite">Risultati: {{ searchResults().join(', ') || '—' }}</p>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>toSignal(interval)</dt>
          <dd>{{ seconds() }}s</dd>
          <dt>subscribe + takeUntilDestroyed</dt>
          <dd>{{ aliveSeconds() }}s</dd>
        </dl>
        <sbu-code [code]="code.interop" />
        <p note>
          <code>toObservable</code> emette via effect (asincrono, solo l'ultimo valore del tick).
          <code>toSignal</code> fa subscribe SUBITO e unsubscribe alla distruzione; senza <code>initialValue</code> il tipo
          include <code>undefined</code> (<code>requireSync: true</code> per BehaviorSubject). Entrambi e
          <code>takeUntilDestroyed()</code> senza argomenti richiedono l'injection context. Per gli output:
          <code>outputFromObservable</code> / <code>outputToObservable</code>.
        </p>
      </sbu-example>



    </sbu-lab-page>
  `,
})
export default class SignalsPage {
  protected readonly code = CODE;
  protected readonly increment = (n: number) => n + 1;
  protected readonly decrement = (n: number) => n - 1;

  // 1. signal + computed
  protected readonly count = signal(0);
  protected readonly double = computed(() => this.count() * 2);
  protected readonly parity = computed(() => (this.count() % 2 === 0 ? 'pari' : 'dispari'));
  protected readonly decade = computed(
    () => {
      const start = Math.floor(this.count() / 10) * 10;
      return { start, label: `${start}–${start + 9}` };
    },
    { equal: (a, b) => a.start === b.start },
  );

  // 2. effect + untracked
  protected readonly label = signal('contatore');
  protected readonly effectLog = signal<readonly string[]>([]);

  // 3. linkedSignal
  protected readonly categories = Object.keys(CATALOG) as Category[];
  protected readonly category = signal<Category>('frutta');
  protected readonly options = computed(() => CATALOG[this.category()]);
  protected readonly choice = linkedSignal<readonly string[], string>({
    source: this.options,
    computation: (options, previous) =>
      previous && options.includes(previous.value) ? previous.value : options[0],
  });
  protected readonly quantity = linkedSignal(() => {
    this.category(); // dipendenza: ogni cambio categoria resetta
    return 1;
  });

  // 4. resource
  protected readonly userIds = [1, 2, 3];
  protected readonly userId = signal<number | undefined>(1);
  protected readonly user = resource({
    params: () => this.userId(),
    loader: ({ params, abortSignal }) => fakeFetchUser(params, abortSignal),
  });

  // 5. rxResource
  protected readonly countdowns = [3, 5, 8];
  protected readonly countdownFrom = signal(3);
  protected readonly countdown = rxResource({
    params: () => this.countdownFrom(),
    stream: ({ params }) =>
      timer(0, 400).pipe(
        take(params + 1),
        map((i) => params - i),
      ),
  });

  // 6. httpResource
  protected readonly postId = signal(1);
  protected readonly post = httpResource<Post>(() => `https://jsonplaceholder.typicode.com/posts/${this.postId()}`);

  // 7. interop
  protected readonly query = signal('');
  protected readonly searchResults = toSignal(
    toObservable(this.query).pipe(
      map((q) => q.trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => (q.length < 2 ? of([]) : fakeSearch(q))),
    ),
    { initialValue: [] },
  );
  protected readonly seconds = toSignal(interval(1000), { initialValue: 0 });
  protected readonly aliveSeconds = signal(0);

  constructor() {
    effect(() => {
      const line = `count = ${this.count()} · etichetta = "${untracked(this.label)}"`;
      this.effectLog.update((log) => [...log, line]);
    });

    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.aliveSeconds.update(this.increment));
  }
}
