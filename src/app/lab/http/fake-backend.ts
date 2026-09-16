import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Observable, concat, defer, map, mergeMap, of, take, throwError, timer } from 'rxjs';
import { DEMO_TOKEN } from './http-state';
import { User } from './users-api';

/** Latenza base del server finto. Nei test si fornisce 0. */
export const FAKE_LATENCY_MS = new InjectionToken<number>('FAKE_LATENCY_MS', { factory: () => 400 });

const REPORT_CSV = 'id,name,email\n1,Ada Lovelace,ada@example.com\n2,Alan Turing,alan@example.com\n';

const STATUS_TEXT: Record<number, string> = {
  0: 'Unknown Error',
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  404: 'Not Found',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

type Reply = HttpResponse<unknown> | HttpErrorResponse;

function reply(req: HttpRequest<unknown>, status: number, body: unknown = null, headers = new HttpHeaders()): Reply {
  // come un server vero: rimanda l'id di correlazione ricevuto
  const requestId = req.headers.get('X-Request-Id');
  const init = {
    status,
    statusText: STATUS_TEXT[status] ?? '',
    url: req.urlWithParams,
    headers: requestId ? headers.set('X-Request-Id', requestId) : headers,
  };
  return status >= 200 && status < 300
    ? new HttpResponse({ ...init, body })
    : new HttpErrorResponse({ ...init, error: body });
}

/** Errore di rete (DNS, CORS, offline): status 0 e `error` NON è il body del server. */
function networkError(req: HttpRequest<unknown>): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 0,
    statusText: STATUS_TEXT[0],
    url: req.urlWithParams,
    error: new ProgressEvent('error'),
  });
}

function isDraft(body: unknown): body is { name: string; email?: string } {
  return typeof body === 'object' && body !== null && 'name' in body && typeof body.name === 'string';
}

/**
 * "Database" in memoria del server finto. Fornito a livello di route: ogni volta che la route viene
 * ricreata riparte dai dati iniziali.
 */
@Injectable()
export class FakeUsersDb {
  private nextId = 4;
  private users: readonly User[] = [
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
    { id: 3, name: 'Grace Hopper', email: 'grace@example.com' },
  ];
  /** Tentativi per chiave, per /api/flaky. */
  private readonly attempts = new Map<string, number>();

  /** Richieste arrivate al server (una per subscribe). */
  readonly hits = signal(0);
  /** Se attivo, il 30% delle richieste fallisce con 500. */
  readonly chaos = signal(false);

  handle(req: HttpRequest<unknown>): Reply {
    if (this.chaos() && Math.random() < 0.3) return reply(req, 500, { message: 'Chaos monkey' });

    const [resource = '', param] = req.url.replace(/^\/api\//, '').split('/');
    const id = Number(param);

    switch (`${req.method} ${resource}`) {
      case 'GET users':
        return param ? this.findUser(req, id) : this.listUsers(req);
      case 'POST users':
        return this.createUser(req);
      case 'PUT users':
      case 'PATCH users':
        return this.updateUser(req, id);
      case 'DELETE users':
        return this.deleteUser(req, id);
      case 'GET me':
        return req.headers.get('Authorization') === `Bearer ${DEMO_TOKEN}`
          ? reply(req, 200, { name: 'Ada Lovelace', role: 'admin' })
          : reply(req, 401, { message: 'Token mancante o non valido' });
      case 'GET flaky':
      case 'POST flaky':
        return this.flaky(req);
      case 'GET status':
        return id === 0 ? networkError(req) : reply(req, id, { message: `Errore ${id} forzato` });
      case 'GET report':
        return this.report(req);
      case 'GET slow':
        return reply(req, 200, { message: 'Risposta lenta arrivata' });
      case 'POST upload':
        return reply(req, 201, req.body);
      default:
        return reply(req, 404, { message: `Endpoint ${req.method} ${req.url} inesistente` });
    }
  }

  private listUsers(req: HttpRequest<unknown>): Reply {
    const q = (req.params.get('q') ?? '').toLowerCase();
    const matching = this.users.filter((user) => user.name.toLowerCase().includes(q));
    const page = Number(req.params.get('page') ?? 1);
    const pageSize = Number(req.params.get('pageSize') ?? matching.length);
    const body = matching.slice((page - 1) * pageSize, page * pageSize);
    return reply(req, 200, body, new HttpHeaders().set('X-Total-Count', String(matching.length)));
  }

  private findUser(req: HttpRequest<unknown>, id: number): Reply {
    const user = this.users.find((u) => u.id === id);
    return user ? reply(req, 200, user) : reply(req, 404, { message: `Utente ${id} inesistente` });
  }

  private createUser(req: HttpRequest<unknown>): Reply {
    if (!isDraft(req.body) || !req.body.name.trim()) return reply(req, 400, { message: 'Il nome è obbligatorio' });
    const user: User = { id: this.nextId++, name: req.body.name.trim(), email: req.body.email ?? '' };
    this.users = [...this.users, user];
    return reply(req, 201, user, new HttpHeaders().set('Location', `/api/users/${user.id}`));
  }

  private updateUser(req: HttpRequest<unknown>, id: number): Reply {
    const current = this.users.find((u) => u.id === id);
    if (!current) return reply(req, 404, { message: `Utente ${id} inesistente` });
    const body = req.body;
    if (!isDraft(body) || !body.name.trim()) return reply(req, 400, { message: 'Il nome è obbligatorio' });
    // PUT sostituisce tutto (i campi non inviati si perdono), PATCH unisce con i valori attuali
    const updated: User =
      req.method === 'PUT'
        ? { id, name: body.name, email: body.email ?? '' }
        : { ...current, name: body.name, email: body.email ?? current.email };
    this.users = this.users.map((u) => (u.id === id ? updated : u));
    return reply(req, 200, updated);
  }

  private deleteUser(req: HttpRequest<unknown>, id: number): Reply {
    if (!this.users.some((u) => u.id === id)) return reply(req, 404, { message: `Utente ${id} inesistente` });
    this.users = this.users.filter((u) => u.id !== id);
    return reply(req, 204);
  }

  /** Fallisce con 503 le prime `failures` volte per la stessa `key`, poi risponde 200. */
  private flaky(req: HttpRequest<unknown>): Reply {
    const key = req.params.get('key') ?? '';
    const attempt = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, attempt);
    return attempt <= Number(req.params.get('failures') ?? 0)
      ? reply(req, 503, { message: `Tentativo ${attempt} fallito` })
      : reply(req, 200, { attempt });
  }

  /**
   * Il body dipende da `responseType`, come farebbe il backend vero (che fa il parsing).
   * Un CSV richiesto come JSON → errore di parsing: HttpErrorResponse con status 200!
   */
  private report(req: HttpRequest<unknown>): Reply {
    switch (req.responseType) {
      case 'text':
        return reply(req, 200, REPORT_CSV);
      case 'blob':
        return reply(req, 200, new Blob([REPORT_CSV], { type: 'text/csv' }));
      default:
        return new HttpErrorResponse({
          status: 200,
          statusText: 'OK',
          url: req.urlWithParams,
          error: { error: new SyntaxError('Unexpected token i in JSON'), text: REPORT_CSV },
        });
    }
  }
}

/** Eventi di upload finti: Sent → 5 × UploadProgress → Response (solo se `reportProgress: true`). */
function withUploadProgress(req: HttpRequest<unknown>, response: HttpResponse<unknown>, stepMs: number) {
  const total = isUpload(req.body) ? req.body.size : 0;
  const steps = 5;
  const sent: HttpEvent<unknown> = { type: HttpEventType.Sent };
  const progress = timer(stepMs, stepMs).pipe(
    take(steps),
    map((i): HttpEvent<unknown> => ({ type: HttpEventType.UploadProgress, loaded: (total * (i + 1)) / steps, total })),
  );
  return concat(of(sent), progress, of(response));
}

function isUpload(body: unknown): body is { size: number } {
  return typeof body === 'object' && body !== null && 'size' in body && typeof body.size === 'number';
}

/**
 * FAKE BACKEND come ultimo interceptor: non chiama `next()`, quindi nessuna richiesta arriva al vero
 * HttpBackend (fetch/XHR). Risponde alle URL `/api/...` con latenza casuale; il resto prosegue.
 */
export const fakeBackendInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  if (!req.url.startsWith('/api/')) return next(req);

  const db = inject(FakeUsersDb);
  const latency = inject(FAKE_LATENCY_MS);
  const wait = req.url === '/api/slow' ? latency * 8 : latency * (0.5 + Math.random());

  // defer: il "server" riceve la richiesta a ogni subscribe (retry compresi), non quando si crea l'Observable
  return defer(() => {
    db.hits.update((n) => n + 1);
    return timer(wait).pipe(
      mergeMap(() => {
        const result = db.handle(req);
        if (result instanceof HttpErrorResponse) return throwError(() => result);
        return req.reportProgress ? withUploadProgress(req, result, latency / 2) : of(result);
      }),
    );
  });
};
