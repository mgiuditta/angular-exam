import {
  FetchBackend,
  HttpBackend,
  HttpClient,
  HttpContext,
  HttpEventType,
  HttpInterceptorFn,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
  withFetch,
  withRequestsMadeViaParent,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, firstValueFrom, lastValueFrom, of, toArray } from 'rxjs';
import { FAKE_LATENCY_MS, FakeUsersDb } from './fake-backend';
import { HttpActivity, Session } from './http-state';
import HttpPage from './http.page';
import routes, { HTTP_PAGE_PROVIDERS } from './http.routes';
import { ApiError, RETRY_COUNT, SKIP_AUTH, TRACE, authInterceptor, errorMappingInterceptor } from './interceptors';
import { User, UsersApi } from './users-api';

/** Attende l'errore di un Observable e verifica che sia un ApiError (prodotto dall'errorMappingInterceptor). */
async function apiError(source: Observable<unknown>): Promise<ApiError> {
  try {
    await firstValueFrom(source);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('La richiesta doveva fallire');
}

/** Stessi provider della route, con il server finto senza latenza. */
function setupPageProviders() {
  TestBed.configureTestingModule({ providers: [HTTP_PAGE_PROVIDERS, { provide: FAKE_LATENCY_MS, useValue: 0 }] });
  return {
    http: TestBed.inject(HttpClient),
    api: TestBed.inject(UsersApi),
    activity: TestBed.inject(HttpActivity),
    db: TestBed.inject(FakeUsersDb),
  };
}

const traced = new HttpContext().set(TRACE, true);

describe('Pagina HTTP (route con i suoi provider)', () => {
  it('si renderizza via router e sopravvive al click su tutti i bottoni', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: FAKE_LATENCY_MS, useValue: 0 }],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', HttpPage);
    await harness.fixture.whenStable();

    const element = harness.routeNativeElement!;
    expect(element.querySelector('h1')?.textContent).toContain('HTTP');
    expect(element.textContent).toContain('Grace Hopper'); // lista caricata dal fake backend

    for (const button of element.querySelectorAll<HTMLButtonElement>('button[type="button"]')) button.click();
    await harness.fixture.whenStable();
    expect(element.textContent).toContain('ApiError.message'); // dettagli dell'ultimo errore forzato
  });
});

describe('Catena di interceptor', () => {
  it('ordine: la richiesta scende in ordine, la risposta risale al contrario', async () => {
    const { http, activity } = setupPageProviders();
    await firstValueFrom(http.get('/api/users/1', { context: traced }));

    const names = ['errorMapping', 'logging', 'loading', 'auth', 'retry', 'fakeBackend'];
    expect(activity.log().filter((e) => e.kind === 'trace').map((e) => e.text)).toEqual([
      ...names.map((name) => `→ ${name}`),
      ...[...names].reverse().map((name) => `← ${name} (200)`),
    ]);
  });

  it('retry ri-sottoscrive solo gli interceptor sotto di lui', async () => {
    const { http, activity } = setupPageProviders();
    await firstValueFrom(http.get('/api/flaky', { params: { key: 'order', failures: 1 }, context: traced }));
    const trace = activity.log().filter((e) => e.kind === 'trace').map((e) => e.text);
    expect(trace.filter((line) => line === '→ fakeBackend')).toHaveLength(2);
    expect(trace.filter((line) => line === '→ auth')).toHaveLength(1);
  });

  it('auth aggiunge il token; SKIP_AUTH lo salta → 401 mappato', async () => {
    const { http } = setupPageProviders();
    await expect(firstValueFrom(http.get('/api/me'))).resolves.toEqual({ name: 'Ada Lovelace', role: 'admin' });

    const error = await apiError(http.get('/api/me', { context: new HttpContext().set(SKIP_AUTH, true) }));
    expect(error.status).toBe(401);
    expect(error.message).toBe('Sessione scaduta: accedi di nuovo.');
  });

  it('logout: nessun header Authorization', async () => {
    const { http } = setupPageProviders();
    TestBed.inject(Session).logout();
    expect((await apiError(http.get('/api/me'))).status).toBe(401);
  });

  it('retry: GET transitoria ritentata con backoff, POST / 404 / RETRY_COUNT 0 no', async () => {
    const { http, db, activity } = setupPageProviders();

    const ok = await firstValueFrom(http.get<{ attempt: number }>('/api/flaky', { params: { key: 'a', failures: 2 } }));
    expect(ok.attempt).toBe(3);
    expect(db.hits()).toBe(3);
    expect(activity.log().filter((e) => e.text.startsWith('↻'))).toHaveLength(2);

    expect((await apiError(http.post('/api/flaky', null, { params: { key: 'b', failures: 1 } }))).status).toBe(503);
    expect(db.hits()).toBe(4);

    expect((await apiError(http.get('/api/users/999'))).status).toBe(404);
    expect(db.hits()).toBe(5);

    const noRetry = new HttpContext().set(RETRY_COUNT, 0);
    expect((await apiError(http.get('/api/flaky', { params: { key: 'c', failures: 1 }, context: noRetry }))).status).toBe(503);
    expect(db.hits()).toBe(6);
  });

  it('error mapping: rete (status 0), server, parsing, validazione', async () => {
    const { http, api } = setupPageProviders();
    const noRetry = new HttpContext().set(RETRY_COUNT, 0);

    const network = await apiError(http.get('/api/status/0', { context: noRetry }));
    expect(network.status).toBe(0);
    expect(network.response.error).toBeInstanceOf(ProgressEvent);
    expect(network.message).toContain('Server non raggiungibile');

    const server = await apiError(http.get('/api/status/500', { context: noRetry }));
    expect(server.message).toBe('Il server ha un problema: riprova tra poco.');
    expect(server.response.error).toEqual({ message: 'Errore 500 forzato' });

    expect((await apiError(http.get('/api/report'))).status).toBe(200);
    expect((await apiError(api.create({ name: ' ', email: '' }))).message).toBe('Il nome è obbligatorio');
  });

  it('loading conta le richieste in corso, logging registra anche le annullate', async () => {
    const { api, activity } = setupPageProviders();
    const subscription = api.get(1).subscribe();
    expect(activity.pending()).toBe(1);
    subscription.unsubscribe();
    expect(activity.pending()).toBe(0);
    expect(activity.log().at(-1)?.text).toContain('annullata');

    await firstValueFrom(api.get(1));
    expect(activity.pending()).toBe(0);
    expect(activity.log().at(-1)).toMatchObject({ kind: 'ok' });
  });
});

describe('HttpClient con il server finto', () => {
  it('Observable cold: nessuna richiesta senza subscribe, una per ogni subscribe', async () => {
    const { api, db } = setupPageProviders();
    const user$ = api.get(1);
    expect(db.hits()).toBe(0);
    await Promise.all([firstValueFrom(user$), firstValueFrom(user$)]);
    expect(db.hits()).toBe(2);
  });

  it('CRUD tipizzato: post, patch, put, delete', async () => {
    const { api } = setupPageProviders();
    const created = await firstValueFrom(api.create({ name: 'Linus', email: 'linus@example.com' }));
    expect(created.id).toBe(4);

    expect(await firstValueFrom(api.rename(4, 'LINUS'))).toEqual({ id: 4, name: 'LINUS', email: 'linus@example.com' });
    expect(await firstValueFrom(api.replace({ id: 4, name: 'Linus T', email: 'lt@example.com' }))).toMatchObject({
      email: 'lt@example.com',
    });
    expect(await firstValueFrom(api.remove(4))).toBeNull();
    expect((await apiError(api.get(4))).status).toBe(404);
  });

  it("observe: 'response' espone status e header", async () => {
    const { api } = setupPageProviders();
    const response = await firstValueFrom(api.page(2, 2));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Total-Count')).toBe('3');
    expect(response.headers.get('X-Request-Id')).toBe('sbu-1');
    expect(response.body?.map((u) => u.name)).toEqual(['Grace Hopper']);
  });

  it('responseType text e blob', async () => {
    const { http } = setupPageProviders();
    expect(await firstValueFrom(http.get('/api/report', { responseType: 'text' }))).toContain('Ada Lovelace');
    expect((await firstValueFrom(http.get('/api/report', { responseType: 'blob' }))).type).toBe('text/csv');
  });

  it('reportProgress + observe events: Sent → UploadProgress → Response', async () => {
    const { http } = setupPageProviders();
    const events = await lastValueFrom(
      http.post('/api/upload', { size: 100 }, { reportProgress: true, observe: 'events' }).pipe(toArray()),
    );
    expect(events.map((e) => e.type)).toEqual([
      HttpEventType.Sent,
      ...Array(5).fill(HttpEventType.UploadProgress),
      HttpEventType.Response,
    ]);
  });
});

describe('UsersApi con HttpTestingController', () => {
  let api: UsersApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorMappingInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        UsersApi,
        Session,
      ],
    });
    api = TestBed.inject(UsersApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('GET con params e header di autenticazione', () => {
    let result: User[] = [];
    api.list('ada').subscribe((users) => (result = users));

    const req = httpTesting.expectOne((r) => r.url === '/api/users' && r.params.get('q') === 'ada');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer demo-token');
    req.flush([{ id: 1, name: 'Ada', email: 'ada@example.com' }]);
    expect(result).toHaveLength(1);
  });

  it('POST invia il body', () => {
    api.create({ name: 'Ada', email: 'ada@example.com' }).subscribe();
    const req = httpTesting.expectOne({ method: 'POST', url: '/api/users' });
    expect(req.request.body).toEqual({ name: 'Ada', email: 'ada@example.com' });
    req.flush({ id: 9, name: 'Ada', email: 'ada@example.com' }, { status: 201, statusText: 'Created' });
  });

  it('errori server e di rete passano dal mapping', async () => {
    const notFound = apiError(api.get(7));
    httpTesting.expectOne('/api/users/7').flush({ message: 'no' }, { status: 404, statusText: 'Not Found' });
    expect((await notFound).message).toBe('Risorsa non trovata.');

    const offline = apiError(api.get(8));
    httpTesting.expectOne('/api/users/8').error(new ProgressEvent('error'));
    expect((await offline).status).toBe(0);
  });
});

describe('provideHttpClient in un injector figlio (come una route) — verifica sulla versione installata', () => {
  let calls: string[];
  const record =
    (name: string): HttpInterceptorFn =>
    (req, next) => {
      calls.push(name);
      return next(req);
    };
  const respond: HttpInterceptorFn = () => of(new HttpResponse({ status: 200, body: 'ok' }));

  beforeEach(() => {
    calls = [];
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([record('root'), respond]))] });
  });

  const childHttp = (providers: Parameters<typeof createEnvironmentInjector>[0]) =>
    createEnvironmentInjector(providers, TestBed.inject(EnvironmentInjector)).get(HttpClient);

  it('HttpClient separato: gli interceptor root NON vengono ereditati', async () => {
    const http = childHttp([provideHttpClient(withInterceptors([record('route'), respond]))]);
    expect(http).not.toBe(TestBed.inject(HttpClient));
    await firstValueFrom(http.get('/x'));
    expect(calls).toEqual(['route']);
  });

  it('il backend invece si eredita: withFetch() root vale anche per la route', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withFetch())] });
    const child = createEnvironmentInjector([provideHttpClient()], TestBed.inject(EnvironmentInjector));
    expect(child.get(HttpBackend)).toBeInstanceOf(FetchBackend);
  });

  it('withRequestsMadeViaParent: prima la catena della route, poi quella root', async () => {
    const http = childHttp([provideHttpClient(withInterceptors([record('route')]), withRequestsMadeViaParent())]);
    await firstValueFrom(http.get('/x'));
    expect(calls).toEqual(['route', 'root']);
  });
});
