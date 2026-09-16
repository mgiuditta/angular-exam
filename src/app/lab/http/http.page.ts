import { AsyncPipe } from '@angular/common';
import {
  HttpClient,
  HttpContext,
  HttpEvent,
  HttpEventType,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { FakeUsersDb } from './fake-backend';
import { HttpActivity, Session } from './http-state';
import { ApiError, RETRY_COUNT, SKIP_AUTH, TRACE } from './interceptors';
import { SlowRequest } from './slow-request';
import { User, UsersApi } from './users-api';

interface Me {
  readonly name: string;
  readonly role: string;
}

interface FlakyResult {
  readonly attempt: number;
}

interface UploadState {
  readonly percent: number;
  readonly phase: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Coppie etichetta/valore per mostrare un ApiError e l'HttpErrorResponse che contiene. */
function describeError(error: unknown): readonly (readonly [string, string])[] {
  if (!(error instanceof ApiError)) return [['errore', messageOf(error)]];
  const { response } = error;
  const body = response.error instanceof ProgressEvent ? 'ProgressEvent (nessun body)' : JSON.stringify(response.error);
  return [
    ['ApiError.message', error.message],
    ['response.status', String(response.status)],
    ['response.statusText', response.statusText],
    ['response.ok', String(response.ok)],
    ['response.error', body],
    ['response.message', response.message],
  ];
}

/** HttpParams e HttpHeaders sono IMMUTABILI: set/append/delete restituiscono una NUOVA istanza. */
function immutabilityDemo() {
  const params = new HttpParams().set('page', 1);
  params.set('pageSize', 10); // valore di ritorno ignorato → params NON cambia
  const headers = new HttpHeaders({ Accept: 'application/json' });
  headers.set('X-Trace', 'on'); // idem
  return {
    ignored: params.toString(),
    chained: params.set('pageSize', 10).append('tag', 'a').append('tag', 'b').toString(),
    fromObject: new HttpParams({ fromObject: { q: 'ada lovelace', tag: ['a', 'b'] } }).toString(),
    headerIgnored: headers.has('X-Trace'),
    headerChained: headers.set('X-Trace', 'on').keys().join(', '),
  };
}

const CODE = {
  crud: ts`
    // users-api.ts
    @Injectable()
    export class UsersApi {
      private readonly http = inject(HttpClient);
      private readonly url = '/api/users';

      list(query = ''): Observable<User[]> {
        return this.http.get<User[]>(this.url, { params: { q: query } });
      }
      get(id: number)             { return this.http.get<User>(\`\${this.url}/\${id}\`); }
      create(draft: UserDraft)    { return this.http.post<User>(this.url, draft); }
      replace(user: User)         { return this.http.put<User>(\`\${this.url}/\${user.id}\`, user); }
      rename(id: number, name: string) {
        return this.http.patch<User>(\`\${this.url}/\${id}\`, { name });
      }
      remove(id: number): Observable<void> {
        return this.http.delete<void>(\`\${this.url}/\${id}\`);   // 204: body null
      }
    }

    // componente
    users = rxResource({ stream: () => this.api.list() });

    private mutate<T>(request: Observable<T>, describe: (value: T) => string) {
      request.subscribe({                          // senza subscribe la POST non parte!
        next: (value) => this.crudResult.set(describe(value)),
        error: (error: unknown) => this.crudResult.set(messageOf(error)),
        complete: () => this.users.reload(),       // HttpClient completa dopo la risposta
      });
    }
  `,
  params: ts`
    page(page: number, pageSize: number): Observable<HttpResponse<User[]>> {
      const params = new HttpParams().set('page', page).set('pageSize', pageSize);
      const headers = new HttpHeaders().set('X-Request-Id', \`sbu-\${++this.requestSeq}\`);
      return this.http.get<User[]>(this.url, { params, headers, observe: 'response' });
    }

    // HttpResponse<User[]>: status, statusText, headers, body, url, ok
    response.status;                        // 200
    response.headers.get('X-Total-Count');  // header custom (CORS: va esposto con Access-Control-Expose-Headers)
    response.body;                          // User[] | null

    // IMMUTABILI
    const params = new HttpParams().set('page', 1);
    params.set('pageSize', 10);                                   // ❌ ignorato
    const next = params.set('pageSize', 10).append('tag', 'a');   // ✅ nuova istanza
    new HttpParams({ fromObject: { q: 'ada', tag: ['a', 'b'] } }); // array → tag=a&tag=b
  `,
  responseType: ts`
    this.http.get('/api/report', { responseType: 'text' });   // Observable<string>
    this.http.get('/api/report', { responseType: 'blob' });   // Observable<Blob>
    this.http.get<unknown>('/api/report');                    // json (default) → errore di parsing

    // ❌ con responseType non-json il generico non è ammesso:
    // this.http.get<string>(url, { responseType: 'text' })   → errore di compilazione
  `,
  cold: ts`
    private readonly user1$ = this.api.get(1);   // nessuna richiesta: l'Observable è solo una "ricetta"

    subscribeCold(times: number) {
      for (let i = 0; i < times; i++) {
        this.user1$.subscribe({                  // OGNI subscribe = una nuova richiesta HTTP
          next: (user) => …,
          complete: () => …,                     // completa dopo la risposta: niente unsubscribe
        });
      }
    }

    // condividere UNA risposta fra più subscriber: shareReplay (vedi pagina RxJS)
    readonly shared$ = this.api.get(1).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  `,
  consume: ts`
    // 1) toSignal: subscribe SUBITO (nel constructor), unsubscribe alla distruzione
    firstUser = toSignal(this.api.get(1));             // Signal<User | undefined>

    // 2) async pipe: subscribe al primo render, unsubscribe alla distruzione
    secondUser$ = this.api.get(2).pipe(catchError(() => of(null)));
    @if (secondUser$ | async; as user) { {{ user.name }} }

    // 3) rxResource: si ricarica quando cambiano i params (switchMap implicito)
    selectedId = signal(1);
    selectedUser = rxResource({
      params: () => this.selectedId(),
      stream: ({ params }) => this.api.get(params),
    });
    @if (selectedUser.error(); as error) { {{ error.message }} }
    @else if (selectedUser.hasValue()) { {{ selectedUser.value().name }} }
  `,
  interceptors: ts`
    export const authInterceptor: HttpInterceptorFn = (req, next) => {
      const token = inject(Session).token();               // inject() sincrono: injection context
      if (!token || req.context.get(SKIP_AUTH) || !req.url.startsWith('/api/')) return next(req);
      return next(req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } }));
    };

    export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
      const activity = inject(HttpActivity);
      const startedAt = performance.now();
      let outcome = 'annullata (unsubscribe)';
      return next(req).pipe(
        tap({
          next: (event) => { if (event.type === HttpEventType.Response) outcome = String(event.status); },
          error: (error: unknown) => { outcome = …; },
        }),
        finalize(() => activity.write(\`\${req.method} \${req.urlWithParams} → \${outcome} in …ms\`)),
      );
    };

    export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
      const activity = inject(HttpActivity);
      activity.started();                                   // pending + 1
      return next(req).pipe(finalize(() => activity.finished()));
    };

    export const errorMappingInterceptor: HttpInterceptorFn = (req, next) =>
      next(req).pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? new ApiError(error.status, userMessage(error), error) : error,
          ),
        ),
      );
  `,
  order: ts`
    // http.routes.ts
    provideHttpClient(
      withInterceptors([
        errorMappingInterceptor,   // richiesta 1° · risposta 6°
        loggingInterceptor,        // richiesta 2° · risposta 5°
        loadingInterceptor,
        authInterceptor,
        retryInterceptor,          // vicino al backend: il retry ripete solo ciò che sta "sotto"
        fakeBackendInterceptor,    // ultimo: non chiama next(), risponde al posto della rete
      ]),
    )

    // nella pagina gli interceptor sono avvolti da traced(nome, fn): con TRACE nel context
    // scrive "→ nome" alla subscribe e "← nome" / "✕ nome" quando passa la risposta
    this.http.get('/api/users/1', { context: new HttpContext().set(TRACE, true) });
  `,
  context: ts`
    export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);   // factory = valore di default
    export const RETRY_COUNT = new HttpContextToken<number>(() => 2);

    // chiamante
    this.http.get('/api/me', { context: new HttpContext().set(SKIP_AUTH, true) });
    this.http.get(url, { context: new HttpContext().set(RETRY_COUNT, 0).set(TRACE, true) });

    // interceptor
    if (req.context.get(SKIP_AUTH)) return next(req);
  `,
  retry: ts`
    export const retryInterceptor: HttpInterceptorFn = (req, next) => {
      const count = req.context.get(RETRY_COUNT);
      if (req.method !== 'GET' || count === 0) return next(req);   // solo GET (idempotente)

      return next(req).pipe(
        retry({
          count,
          delay: (error: unknown, attempt: number) => {
            if (!isTransient(error)) return throwError(() => error);  // 4xx: inutile ritentare
            return timer(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));   // 300ms, 600ms, …
          },
        }),
      );
    };

    const isTransient = (error: unknown) =>
      error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
  `,
  errors: ts`
    // HttpErrorResponse
    error.status === 0     // rete: offline, DNS, CORS bloccato, richiesta annullata dal browser
                           // error.error = ProgressEvent (XHR) / errore di fetch, NON il body
    error.status >= 400    // il server ha risposto: error.error = body già parsato ({ message })
    error.status === 200   // risposta 2xx ma parsing fallito (es. HTML/CSV chiesto come json)

    // ❌ catchError sull'esterno: il primo errore COMPLETA lo stream, la ricerca smette di funzionare
    query$.pipe(switchMap((q) => this.api.list(q)), catchError(() => of([])));
    // ✅ catchError sull'Observable INTERNO
    query$.pipe(switchMap((q) => this.api.list(q).pipe(catchError(() => of([])))));

    // rilanciare un errore diverso (serve una FACTORY)
    catchError((error: unknown) => throwError(() => new ApiError(…)));
  `,
  cancel: ts`
    // switchMap: la richiesta precedente riceve unsubscribe → HttpClient la annulla
    searchResults = toSignal(
      this.search.valueChanges.pipe(
        switchMap((q) => this.api.list(q).pipe(catchError(() => of([])))),
      ),
      { initialValue: [] },
    );

    // takeUntilDestroyed: nel constructor senza argomenti, altrove con DestroyRef
    constructor() {
      inject(HttpClient).get('/api/slow').pipe(takeUntilDestroyed()).subscribe(…);
    }
    upload() {
      this.http.post(…).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(…);
    }
  `,
  progress: ts`
    this.http
      .post('/api/upload', file, { reportProgress: true, observe: 'events' })
      .subscribe((event: HttpEvent<unknown>) => {
        switch (event.type) {
          case HttpEventType.Sent:
            break;
          case HttpEventType.UploadProgress:         // anche DownloadProgress
            const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
            break;
          case HttpEventType.Response:               // HttpResponse: status + body
            break;
        }
      });
  `,
  setup: ts`
    // app.config.ts — HttpClient ROOT
    provideHttpClient(withFetch(), withInterceptors([rootInterceptor]))

    // route — HttpClient SEPARATO nell'environment injector della route (e dei figli)
    { path: '', component: HttpPage, providers: [
      provideHttpClient(withInterceptors([pageInterceptor])),   // rootInterceptor NON gira
      UsersApi,                                                 // riceve l'HttpClient della route
    ] }

    // per passare ANCHE dalla catena del padre: prima pageInterceptor, poi rootInterceptor + backend root
    provideHttpClient(withInterceptors([pageInterceptor]), withRequestsMadeViaParent())

    // Legacy: interceptor a classi (NgModule style)
    @Injectable()
    export class LegacyAuthInterceptor implements HttpInterceptor {
      intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(req.clone({ setHeaders: { Authorization: 'Bearer …' } }));
      }
    }
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: LegacyAuthInterceptor, multi: true },

    // XSRF (attivo di default): legge il cookie e aggiunge l'header alle mutazioni same-origin
    provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))
    provideHttpClient(withNoXsrfProtection())

    // SSR: le GET/HEAD fatte sul server finiscono nell'HTML e vengono riusate in hydration
    provideClientHydration(withHttpTransferCacheOptions({ includePostRequests: false }))
    this.http.get(url, { transferCache: false });   // opt-out per singola richiesta
  `,
  testing: ts`
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorMappingInterceptor])),
        provideHttpClientTesting(),                // DOPO provideHttpClient: sostituisce il backend
        UsersApi, Session,
      ],
    });
    const api = TestBed.inject(UsersApi);
    const httpTesting = TestBed.inject(HttpTestingController);

    let result: User[] = [];
    api.list('ada').subscribe((users) => (result = users));      // senza subscribe: expectOne fallisce

    const req = httpTesting.expectOne((r) => r.url === '/api/users' && r.params.get('q') === 'ada');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer demo-token');
    req.flush([{ id: 1, name: 'Ada', email: 'ada@example.com' }]);
    expect(result).toHaveLength(1);

    // errore: req.flush(body, { status: 404, statusText: 'Not Found' })
    // rete:   req.error(new ProgressEvent('error'))
    httpTesting.verify();                          // nessuna richiesta inattesa rimasta aperta
  `,
};

/**
 * Pagina: HTTP
 *
 * Checklist certificazione:
 * - HttpClient: get<T>/post/put/patch/delete restituiscono Observable COLD (subscribe = richiesta) che completano.
 * - HttpParams/HttpHeaders/HttpRequest sono IMMUTABILI: set/append/clone restituiscono nuove istanze.
 * - observe: 'body' (default) | 'response' (HttpResponse) | 'events' (con reportProgress); responseType: json/text/blob/arraybuffer.
 * - Interceptor funzionali (HttpInterceptorFn) con withInterceptors: richiesta in ordine, risposta in ordine inverso.
 *   inject() solo sincrono. HttpContextToken per configurare un interceptor per singola richiesta.
 * - HttpErrorResponse: status 0 = rete, >= 400 = server (error.error = body). catchError sull'Observable interno.
 * - Retry solo su richieste idempotenti ed errori transitori. switchMap/unsubscribe annullano la richiesta.
 * - provideHttpClient in una route = HttpClient separato: interceptor root NON ereditati (withRequestsMadeViaParent).
 * - Test: provideHttpClient() + provideHttpClientTesting() + HttpTestingController (expectOne, flush, verify).
 */
@Component({
  selector: 'sbu-http-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock, AsyncPipe, ReactiveFormsModule, SlowRequest],
  template: `
    <sbu-lab-page heading="HTTP">
      <span intro>
        HttpClient con un backend finto (interceptor in memoria, latenza casuale). Richieste in corso:
        <span role="status" class="font-semibold text-foreground">
          {{ activity.pending() }}{{ activity.loading() ? ' ⏳' : '' }}
        </span>
        · richieste ricevute dal server: {{ db.hits() }}
      </span>

      <sbu-example [n]="1" title="HttpClient tipizzato: get, post, put, patch, delete">
        <form class="flex flex-wrap items-end gap-2" (submit)="$event.preventDefault(); createUser()">
          <label class="flex flex-col gap-1 text-sm">
            Nuovo utente
            <input class="field" [formControl]="newUserName" placeholder="vuoto → 400 dal server" />
          </label>
          <button type="submit" class="btn">Crea (POST)</button>
          <button type="button" class="btn" (click)="users.reload()">Ricarica (GET)</button>
        </form>
        <p class="mt-2 text-sm" aria-live="polite">
          {{ users.isLoading() ? 'Caricamento…' : '' }} {{ crudResult() }}
        </p>
        @if (users.hasValue()) {
          <ul class="mt-2 flex flex-col gap-2 text-sm">
            @for (user of users.value(); track user.id) {
              <li class="flex flex-wrap items-center gap-2">
                <span class="min-w-48">#{{ user.id }} {{ user.name }} · {{ user.email }}</span>
                <button type="button" class="btn" [attr.aria-label]="'Maiuscolo (PATCH) ' + user.name" (click)="renameUser(user)">
                  PATCH
                </button>
                <button type="button" class="btn" [attr.aria-label]="'Sostituisci (PUT) ' + user.name" (click)="replaceUser(user)">
                  PUT
                </button>
                <button type="button" class="btn" [attr.aria-label]="'Elimina (DELETE) ' + user.name" (click)="removeUser(user)">
                  DELETE
                </button>
              </li>
            } @empty {
              <li class="text-muted-foreground">Nessun utente</li>
            }
          </ul>
        }
        <sbu-code [code]="code.crud" />
        <p note>
          Il generico <code>get&lt;User[]&gt;</code> è solo un'ASSERZIONE di tipo: nessuna validazione a runtime.
          <code>post/put/patch(url, body, options)</code>, <code>delete(url, options)</code> (per un body in DELETE:
          <code>options.body</code>). HttpClient serializza il body in JSON e imposta <code>Content-Type</code>. Il
          servizio qui è fornito nella route invece di <code>providedIn: 'root'</code>: vedi esempio 13.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="HttpParams, HttpHeaders, observe: 'response'">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn" [disabled]="pageNumber() === 1" (click)="pageNumber.update(decrement)">
            ◀ Pagina
          </button>
          <button type="button" class="btn" [disabled]="pageNumber() >= lastPage()" (click)="pageNumber.update(increment)">
            Pagina ▶
          </button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          @if (pageResponse.hasValue()) {
            <dt>url</dt>
            <dd><code>{{ pageResponse.value().url }}</code></dd>
            <dt>status</dt>
            <dd>{{ pageResponse.value().status }} {{ pageResponse.value().statusText }}</dd>
            <dt>header X-Total-Count</dt>
            <dd>{{ totalUsers() }} (pagina {{ pageNumber() }} di {{ lastPage() }})</dd>
            <dt>header X-Request-Id</dt>
            <dd>{{ pageResponse.value().headers.get('X-Request-Id') }}</dd>
            <dt>body</dt>
            <dd>
              @for (user of pageResponse.value().body; track user.id) {
                <span class="mr-2">{{ user.name }}</span>
              }
            </dd>
          } @else {
            <dt>status</dt>
            <dd>{{ pageResponse.status() }}</dd>
          }
        </dl>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>params.set() ignorato</dt>
          <dd><code>{{ immutability.ignored }}</code></dd>
          <dt>set().append().append()</dt>
          <dd><code>{{ immutability.chained }}</code></dd>
          <dt>fromObject</dt>
          <dd><code>{{ immutability.fromObject }}</code></dd>
          <dt>headers.set() ignorato → has</dt>
          <dd><code>{{ immutability.headerIgnored }}</code></dd>
          <dt>headers.set().keys()</dt>
          <dd><code>{{ immutability.headerChained }}</code></dd>
        </dl>
        <sbu-code [code]="code.params" />
        <p note>
          <code>params</code>/<code>headers</code> accettano anche oggetti semplici (<code>{{ '{' }} q: 'ada' {{ '}' }}</code>).
          <code>set</code> sostituisce, <code>append</code> aggiunge un valore alla stessa chiave. Con
          <code>observe: 'response'</code> il tipo diventa <code>Observable&lt;HttpResponse&lt;T&gt;&gt;</code>;
          <code>body</code> è <code>T | null</code>. Header custom in CORS: il server deve esporli.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="responseType: json, text, blob">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="loadReportAsText()">responseType: 'text'</button>
          <button type="button" class="btn" (click)="loadReportAsBlob()">responseType: 'blob'</button>
          <button type="button" class="btn" (click)="loadReportAsJson()">json (default)</button>
        </div>
        <pre class="mt-3 min-h-10 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs" aria-live="polite">{{ reportResult() }}</pre>
        <sbu-code [code]="code.responseType" />
        <p note>
          Il tipo di ritorno dipende da <code>responseType</code> (overload): <code>'text'</code> →
          <code>string</code>, <code>'blob'</code> → <code>Blob</code>, <code>'arraybuffer'</code> →
          <code>ArrayBuffer</code>. Un CSV chiesto come json produce un <code>HttpErrorResponse</code> con
          <code>status 200</code>: il server ha risposto bene, è fallito il parsing.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Observable cold: niente subscribe, niente richiesta">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="subscribeCold(1)">subscribe()</button>
          <button type="button" class="btn" (click)="subscribeCold(2)">subscribe() × 2</button>
        </div>
        <ol role="log" tabindex="0" aria-label="Log delle subscribe" class="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-ring">
          @for (line of coldLog(); track $index) {
            <li>{{ line }}</li>
          } @empty {
            <li>user1$ creato nel costruttore: nessuna richiesta partita</li>
          }
        </ol>
        <sbu-code [code]="code.cold" />
        <p note>
          Chiamare <code>api.get(1)</code> NON fa partire nulla. Ogni <code>subscribe</code> esegue di nuovo
          l'Observable → nuova richiesta (guarda il contatore in alto). HttpClient emette UNA volta e completa: non
          serve unsubscribe per evitare leak, serve solo per ANNULLARE (esempio 11). Errore tipico: un metodo di
          salvataggio che chiama <code>http.post()</code> senza subscribe.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="Consumare: toSignal, async pipe, rxResource" level="intermedio">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt>toSignal(api.get(1))</dt>
          <dd>{{ firstUser()?.name ?? 'caricamento…' }}</dd>
          <dt>api.get(2) | async</dt>
          <dd>
            @if (secondUser$ | async; as user) {
              {{ user.name }}
            } @else {
              caricamento… / errore
            }
          </dd>
          <dt>rxResource</dt>
          <dd>
            @if (selectedUser.error(); as error) {
              <span class="text-destructive">{{ error.message }}</span>
            } @else if (selectedUser.hasValue()) {
              {{ selectedUser.value().name }}
            } @else {
              {{ selectedUser.status() }}
            }
          </dd>
        </dl>
        <div class="mt-3 flex flex-wrap gap-2">
          @for (id of userIds; track id) {
            <button type="button" class="btn" [attr.aria-pressed]="selectedId() === id" (click)="selectedId.set(id)">
              Utente {{ id }}
            </button>
          }
        </div>
        <sbu-code [code]="code.consume" />
        <p note>
          <code>toSignal</code> fa subscribe subito e, se l'Observable va in errore, LEGGERE il signal lancia l'errore.
          L'async pipe inoltra l'errore all'ErrorHandler: gestiscilo con <code>catchError</code>. Per letture reattive
          basate su signal c'è anche <code>httpResource</code> (pagina Signal, esempio 6:
          <code>src/app/lab/signals/signals.page.ts</code>); per le scritture resta HttpClient.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="Interceptor funzionali: auth, logging, loading, errori" level="intermedio">
        <div class="flex flex-wrap items-center gap-2">
          @if (session.token()) {
            <button type="button" class="btn" (click)="session.logout()">Logout (rimuovi token)</button>
          } @else {
            <button type="button" class="btn" (click)="session.login()">Login</button>
          }
          <button type="button" class="btn" (click)="loadMe()">GET /api/me</button>
          <button type="button" class="btn" (click)="activity.clear()">Svuota log</button>
        </div>
        <p class="mt-2 text-sm" aria-live="polite">{{ meResult() }}</p>
        <ol role="log" tabindex="0" aria-label="Log delle richieste" class="mt-3 max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-ring">
          @for (entry of requestLog(); track entry.id) {
            <li [class.font-semibold]="entry.kind === 'error'">{{ entry.text }}</li>
          } @empty {
            <li>Nessuna richiesta registrata</li>
          }
        </ol>
        <sbu-code [code]="code.interceptors" />
        <p note>
          Un <code>HttpInterceptorFn</code> riceve <code>(req, next)</code> e restituisce
          <code>next(req)</code>, eventualmente trasformato. <code>inject()</code> funziona solo nella parte SINCRONA
          (dentro gli operatori non c'è injection context). La richiesta è immutabile: <code>req.clone()</code>.
          <code>finalize</code> gira su complete, error e unsubscribe: perfetto per contatori e tempi.
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="Ordine degli interceptor" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="traceUser(1)">Tracciata: 200</button>
          <button type="button" class="btn" (click)="traceUser(99)">Tracciata: 404</button>
          <button type="button" class="btn" (click)="traceFlaky()">Tracciata: 503 + retry</button>
        </div>
        <p class="mt-2 text-sm" aria-live="polite">{{ traceResult() }}</p>
        <ol role="log" tabindex="0" aria-label="Traccia degli interceptor" class="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-ring">
          @for (entry of traceLog(); track entry.id) {
            <li>{{ entry.text }}</li>
          } @empty {
            <li>Avvia una richiesta tracciata</li>
          }
        </ol>
        <sbu-code [code]="code.order" />
        <p note>
          La richiesta scende nell'ordine dell'array (→), la risposta risale al contrario (←). Con il retry, solo gli
          interceptor SOTTO <code>retry</code> vengono ri-sottoscritti. Per questo <code>errorMapping</code> è primo
          (i livelli sotto vedono ancora <code>HttpErrorResponse</code>) e il retry sta vicino al backend.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="HttpContextToken: disattivare un interceptor per richiesta" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="loadMeInto(contextResult)">GET /api/me</button>
          <button type="button" class="btn" (click)="loadMeWithoutAuth()">GET /api/me con SKIP_AUTH</button>
          <button type="button" class="btn" (click)="loadFlakyWithoutRetry()">GET /api/flaky con RETRY_COUNT 0</button>
        </div>
        <p class="mt-2 text-sm" aria-live="polite">{{ contextResult() }}</p>
        <sbu-code [code]="code.context" />
        <p note>
          <code>new HttpContextToken(() =&gt; default)</code>: la factory dà il valore quando il token non è impostato.
          <code>HttpContext</code> è mutabile (<code>set</code> restituisce lo stesso context, concatenabile) e NON
          viene inviato al server. Casi tipici: saltare auth per login/refresh, disabilitare cache, spinner o retry.
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="Retry con backoff solo per GET" level="avanzato">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="loadFlakyInto(retryResult, 'GET', 2)">GET: 2 errori 503</button>
          <button type="button" class="btn" (click)="loadFlakyInto(retryResult, 'GET', 5)">GET: 5 errori 503</button>
          <button type="button" class="btn" (click)="loadFlakyInto(retryResult, 'POST', 1)">POST: 1 errore 503</button>
          <button type="button" class="btn" (click)="loadUserInto(retryResult, 999)">GET 404</button>
        </div>
        <label class="mt-3 flex items-center gap-2 text-sm">
          <input #chaosBox type="checkbox" [checked]="db.chaos()" (change)="db.chaos.set(chaosBox.checked)" />
          Chaos: il 30% delle richieste fallisce con 500
        </label>
        <p class="mt-2 text-sm" aria-live="polite">{{ retryResult() }}</p>
        <sbu-code [code]="code.retry" />
        <p note>
          Guarda il log dell'esempio 6: GET con 2 errori → 2 retry (300ms, 600ms) poi 200. Con 5 errori si arrende
          dopo <code>count</code>. La POST non viene ripetuta (potrebbe duplicare dati), il 404 nemmeno (non è
          transitorio). <code>retry({{ '{' }} count, delay {{ '}' }})</code> sostituisce il vecchio
          <code>retryWhen</code> (deprecato).
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="HttpErrorResponse: rete vs server, dove mettere catchError" level="intermedio">
        <div class="flex flex-wrap gap-2">
          @for (status of errorStatuses; track status) {
            <button type="button" class="btn" (click)="forceError(status)">Status {{ status }}</button>
          }
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
          @for (row of errorDetails(); track row[0]) {
            <dt><code>{{ row[0] }}</code></dt>
            <dd class="break-all">{{ row[1] }}</dd>
          }
        </dl>
        <sbu-code [code]="code.errors" />
        <p note>
          Tre livelli possibili: interceptor (mapping globale, logout su 401), servizio (fallback di dominio),
          componente (messaggio in UI). <code>throwError(() =&gt; err)</code> vuole una factory. Nel <code>subscribe</code>
          passa sempre un handler <code>error</code>: altrimenti l'errore finisce nell'ErrorHandler globale.
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="Annullare: switchMap e takeUntilDestroyed" level="intermedio">
        <label class="flex flex-col gap-1 text-sm">
          Cerca utenti (scrivi veloce: guarda "annullata" nel log dell'esempio 6)
          <input class="field" [formControl]="search" placeholder="es. a, al, ala" />
        </label>
        <p class="mt-2 text-sm" aria-live="polite">
          Risultati:
          @for (user of searchResults(); track user.id) {
            <span class="mr-2">{{ user.name }}</span>
          } @empty {
            nessuno
          }
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" class="btn" (click)="showSlow.set(!showSlow())">
            {{ showSlow() ? 'Distruggi il componente' : 'Crea componente con richiesta lenta' }}
          </button>
          @if (showSlow()) {
            <sbu-slow-request />
          }
        </div>
        <sbu-code [code]="code.cancel" />
        <p note>
          <code>debounceTime</code> è omesso apposta per vedere le cancellazioni: in produzione va messo prima di
          <code>switchMap</code>. Unsubscribe da una richiesta HTTP = abort vero (fetch/XHR), ma il server potrebbe
          averla già elaborata: annullare una POST non annulla la scrittura.
        </p>
      </sbu-example>

      <sbu-example [n]="12" title="Eventi di progresso: reportProgress + HttpEventType" level="avanzato">
        <button type="button" class="btn" (click)="upload()">Carica report.pdf (2,4 MB finti)</button>
        <div class="mt-3 flex items-center gap-3 text-sm">
          <progress class="w-48" max="100" [value]="uploadState().percent" aria-label="Avanzamento upload"></progress>
          <span aria-live="polite">{{ uploadState().percent }}% · {{ uploadState().phase }}</span>
        </div>
        <sbu-code [code]="code.progress" />
        <p note>
          Servono ENTRAMBI <code>reportProgress: true</code> e <code>observe: 'events'</code>. Con
          <code>withFetch()</code> è disponibile solo il progresso di DOWNLOAD (fetch non espone l'upload): per
          l'upload serve il backend XHR. <code>event.total</code> può mancare (niente Content-Length).
        </p>
      </sbu-example>

      <sbu-example [n]="13" title="Configurazione: route-level, withFetch, legacy, XSRF, SSR" level="avanzato">
        <sbu-code [code]="code.setup" />
        <p note>
          Verificato su Angular 21.2: <code>provideHttpClient()</code> nei providers di una route crea un nuovo
          HttpClient con la SUA lista <code>HTTP_INTERCEPTOR_FNS</code> (multi provider: non si somma a quella root),
          quindi gli interceptor di <code>app.config.ts</code> non girano. Il BACKEND invece si eredita: il token di
          <code>withFetch()</code> viene cercato risalendo gli injector, quindi anche questa pagina userebbe fetch.
          Un servizio <code>providedIn: 'root'</code> riceve sempre l'HttpClient root.
        </p>
        <p note>
          <code>withInterceptorsFromDi()</code> + <code>HTTP_INTERCEPTORS</code> servono solo per interceptor a classi
          (librerie o codice pre-standalone): fra loro l'ordine è quello di registrazione, nella catena stanno nella
          posizione della feature dentro <code>provideHttpClient(...)</code>. XSRF: attivo di default, aggiunge l'header solo a richieste non GET/HEAD verso la
          stessa origine. SSR: <code>HttpTransferCache</code> (attivo con <code>provideClientHydration()</code>) evita di
          ripetere nel browser le GET già fatte sul server; esclude di default POST e richieste con Authorization.
        </p>
      </sbu-example>

      <sbu-example [n]="14" title="Testing: provideHttpClientTesting + HttpTestingController" level="avanzato">
        <sbu-code [code]="code.testing" />
        <p note>
          <code>provideHttpClientTesting()</code> sostituisce l'<code>HttpBackend</code>: gli interceptor girano
          davvero. <code>expectOne</code> fallisce se le richieste corrispondenti sono 0 o più di 1;
          <code>match</code> per più richieste, <code>expectNone</code> per l'assenza. Le richieste restano pendenti
          finché non chiami <code>flush</code>/<code>error</code>. Test completi in <code>http.spec.ts</code>.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class HttpPage {
  protected readonly code = CODE;
  protected readonly increment = (n: number) => n + 1;
  protected readonly decrement = (n: number) => n - 1;

  private readonly http = inject(HttpClient);
  private readonly api = inject(UsersApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly activity = inject(HttpActivity);
  protected readonly session = inject(Session);
  protected readonly db = inject(FakeUsersDb);

  // 1. CRUD
  protected readonly users = rxResource({ stream: () => this.api.list() });
  protected readonly newUserName = new FormControl('', { nonNullable: true });
  protected readonly crudResult = signal('');

  // 2. params, headers, observe: 'response'
  private readonly pageSize = 2;
  protected readonly pageNumber = signal(1);
  protected readonly pageResponse = rxResource({
    params: () => this.pageNumber(),
    stream: ({ params }) => this.api.page(params, this.pageSize),
  });
  protected readonly totalUsers = computed(() =>
    this.pageResponse.hasValue() ? Number(this.pageResponse.value().headers.get('X-Total-Count')) : 0,
  );
  protected readonly lastPage = computed(() => Math.max(1, Math.ceil(this.totalUsers() / this.pageSize)));
  protected readonly immutability = immutabilityDemo();

  // 3. responseType
  protected readonly reportResult = signal('');

  // 4. cold
  private readonly user1$ = this.api.get(1);
  private coldSubscriptions = 0;
  protected readonly coldLog = signal<readonly string[]>([]);

  // 5. consumare
  protected readonly firstUser = toSignal(this.api.get(1));
  protected readonly secondUser$ = this.api.get(2).pipe(catchError(() => of(null)));
  protected readonly userIds = [1, 2, 3, 99];
  protected readonly selectedId = signal(1);
  protected readonly selectedUser = rxResource({
    params: () => this.selectedId(),
    stream: ({ params }) => this.api.get(params),
  });

  // 6-7. interceptor e ordine
  protected readonly meResult = signal('');
  protected readonly traceResult = signal('');
  protected readonly requestLog = computed(() => this.activity.log().filter((entry) => entry.kind !== 'trace'));
  protected readonly traceLog = computed(() => this.activity.log().filter((entry) => entry.kind === 'trace'));

  // 8-9. context token e retry
  private flakySeq = 0;
  protected readonly contextResult = signal('');
  protected readonly retryResult = signal('');

  // 10. errori
  protected readonly errorStatuses = [0, 400, 401, 404, 500];
  protected readonly errorDetails = signal<readonly (readonly [string, string])[]>([]);

  // 11. cancellazione
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly searchResults = toSignal(
    this.search.valueChanges.pipe(switchMap((q) => this.api.list(q).pipe(catchError(() => of([]))))),
    { initialValue: [] },
  );
  protected readonly showSlow = signal(false);

  // 12. progresso
  protected readonly uploadState = signal<UploadState>({ percent: 0, phase: 'in attesa' });

  // ── 1 ──
  protected createUser(): void {
    const name = this.newUserName.value;
    const email = `${name.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`;
    this.mutate(this.api.create({ name, email }), (user) => `POST → creato #${user.id} ${user.name}`);
    this.newUserName.reset();
  }

  protected renameUser(user: User): void {
    this.mutate(this.api.rename(user.id, user.name.toUpperCase()), (u) => `PATCH → "${u.name}", email invariata`);
  }

  protected replaceUser(user: User): void {
    const replacement = { ...user, email: `nuova.${user.email}` };
    this.mutate(this.api.replace(replacement), (u) => `PUT → risorsa sostituita, email ${u.email}`);
  }

  protected removeUser(user: User): void {
    this.mutate(this.api.remove(user.id), () => `DELETE → 204, eliminato ${user.name}`);
  }

  private mutate<T>(request: Observable<T>, describe: (value: T) => string): void {
    request.subscribe({
      next: (value) => this.crudResult.set(describe(value)),
      error: (error: unknown) => this.crudResult.set(messageOf(error)),
      complete: () => this.users.reload(),
    });
  }

  // ── 3 ──
  protected loadReportAsText(): void {
    this.showIn(this.reportResult, this.http.get('/api/report', { responseType: 'text' }), (csv) => csv);
  }

  protected loadReportAsBlob(): void {
    this.showIn(
      this.reportResult,
      this.http.get('/api/report', { responseType: 'blob' }),
      (blob) => `Blob: ${blob.size} byte, type "${blob.type}"`,
    );
  }

  protected loadReportAsJson(): void {
    this.showIn(this.reportResult, this.http.get<unknown>('/api/report'), (body) => JSON.stringify(body));
  }

  // ── 4 ──
  protected subscribeCold(times: number): void {
    for (let i = 0; i < times; i++) {
      const n = ++this.coldSubscriptions;
      const write = (line: string) => this.coldLog.update((log) => [...log, `#${n} ${line}`]);
      write('subscribe → parte la richiesta');
      this.user1$.subscribe({
        next: (user) => write(`next: ${user.name}`),
        error: (error: unknown) => write(`error: ${messageOf(error)}`),
        complete: () => write('complete'),
      });
    }
  }

  // ── 6 / 8 ──
  protected loadMe(): void {
    this.loadMeInto(this.meResult);
  }

  protected loadMeInto(target: WritableSignal<string>, context?: HttpContext): void {
    this.showIn(target, this.http.get<Me>('/api/me', { context }), (me) => `200: ${me.name} (${me.role})`);
  }

  protected loadMeWithoutAuth(): void {
    this.loadMeInto(this.contextResult, new HttpContext().set(SKIP_AUTH, true));
  }

  protected loadFlakyWithoutRetry(): void {
    this.loadFlakyInto(this.contextResult, 'GET', 1, new HttpContext().set(RETRY_COUNT, 0));
  }

  // ── 7 ──
  protected traceUser(id: number): void {
    this.activity.clear('trace');
    this.loadUserInto(this.traceResult, id, new HttpContext().set(TRACE, true));
  }

  protected traceFlaky(): void {
    this.activity.clear('trace');
    this.loadFlakyInto(this.traceResult, 'GET', 1, new HttpContext().set(TRACE, true));
  }

  // ── 9 ──
  protected loadUserInto(target: WritableSignal<string>, id: number, context?: HttpContext): void {
    this.showIn(target, this.http.get<User>(`/api/users/${id}`, { context }), (user) => `200: ${user.name}`);
  }

  protected loadFlakyInto(
    target: WritableSignal<string>,
    method: 'GET' | 'POST',
    failures: number,
    context?: HttpContext,
  ): void {
    const params = { key: `flaky-${++this.flakySeq}`, failures };
    const request =
      method === 'GET'
        ? this.http.get<FlakyResult>('/api/flaky', { params, context })
        : this.http.post<FlakyResult>('/api/flaky', null, { params, context });
    target.set(`${method} /api/flaky in corso…`);
    this.showIn(target, request, (body) => `${method} riuscita al tentativo ${body.attempt}`);
  }

  // ── 10 ──
  protected forceError(status: number): void {
    // RETRY_COUNT 0: status 0 e 500 sarebbero ritentati
    const context = new HttpContext().set(RETRY_COUNT, 0);
    this.http.get(`/api/status/${status}`, { context }).subscribe({
      error: (error: unknown) => this.errorDetails.set(describeError(error)),
    });
  }

  // ── 12 ──
  protected upload(): void {
    const file = { name: 'report.pdf', size: 2_400_000 };
    this.http
      .post('/api/upload', file, { reportProgress: true, observe: 'events' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.onUploadEvent(event),
        error: (error: unknown) => this.uploadState.set({ percent: 0, phase: messageOf(error) }),
      });
  }

  private onUploadEvent(event: HttpEvent<unknown>): void {
    switch (event.type) {
      case HttpEventType.Sent:
        this.uploadState.set({ percent: 0, phase: 'Sent: richiesta partita' });
        break;
      case HttpEventType.UploadProgress: {
        const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
        this.uploadState.set({ percent, phase: `UploadProgress: ${event.loaded} / ${event.total} byte` });
        break;
      }
      case HttpEventType.Response:
        this.uploadState.set({ percent: 100, phase: `Response: ${event.status}` });
        break;
    }
  }

  /** Subscribe con gestione dell'errore: scrive il risultato (o ApiError.message) nel signal. */
  private showIn<T>(target: WritableSignal<string>, request: Observable<T>, describe: (value: T) => string): void {
    request.subscribe({
      next: (value) => target.set(describe(value)),
      error: (error: unknown) => target.set(`Errore: ${messageOf(error)}`),
    });
  }
}
