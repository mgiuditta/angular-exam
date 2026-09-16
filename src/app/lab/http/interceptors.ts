import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEventType,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, defer, finalize, retry, tap, throwError, timer } from 'rxjs';
import { HttpActivity, Session } from './http-state';

// ── HttpContextToken: metadati PER RICHIESTA letti dagli interceptor (non viaggiano in rete) ──

/** `true` → l'auth interceptor non aggiunge l'header Authorization. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
/** Numero di retry per le GET. `0` → nessun retry. */
export const RETRY_COUNT = new HttpContextToken<number>(() => 2);
/** `true` → ogni interceptor scrive nel log quando la richiesta entra e la risposta esce. */
export const TRACE = new HttpContextToken<boolean>(() => false);

export const RETRY_BASE_DELAY_MS = 300;

/** Errore "applicativo" per i componenti: messaggio leggibile + risposta originale. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly response: HttpErrorResponse,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function serverMessage(error: HttpErrorResponse): string | undefined {
  const body: unknown = error.error;
  return typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
    ? body.message
    : undefined;
}

export function userMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Server non raggiungibile: controlla la connessione e riprova.';
  if (error.status >= 500) return 'Il server ha un problema: riprova tra poco.';
  switch (error.status) {
    case 200:
      return 'Risposta in un formato inatteso (parsing fallito).';
    case 400:
      return serverMessage(error) ?? 'Dati non validi.';
    case 401:
      return 'Sessione scaduta: accedi di nuovo.';
    case 403:
      return 'Non hai i permessi per questa operazione.';
    case 404:
      return 'Risorsa non trovata.';
    default:
      return `Errore imprevisto (${error.status}).`;
  }
}

/** 1° nella catena → ultimo a vedere la risposta: i componenti ricevono sempre ApiError. */
export const errorMappingInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) =>
      throwError(() => (error instanceof HttpErrorResponse ? new ApiError(error.status, userMessage(error), error) : error)),
    ),
  );

/** Tempo totale (retry compresi) con finalize: gira su complete, error E unsubscribe. */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const activity = inject(HttpActivity); // inject() va chiamato in modo SINCRONO, non dentro gli operatori
  const startedAt = performance.now();
  let outcome = 'annullata (unsubscribe)';
  let failed = false;
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) outcome = String(event.status);
      },
      error: (error: unknown) => {
        failed = true;
        outcome = error instanceof HttpErrorResponse ? `errore ${error.status}` : 'errore';
      },
    }),
    finalize(() => {
      const ms = Math.round(performance.now() - startedAt);
      activity.write(`${req.method} ${req.urlWithParams} → ${outcome} in ${ms}ms`, failed ? 'error' : 'ok');
    }),
  );
};

/** Contatore globale delle richieste in corso (spinner, barra di caricamento). */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const activity = inject(HttpActivity);
  activity.started();
  return next(req).pipe(finalize(() => activity.finished()));
};

/** Aggiunge il token solo alle nostre API: mai inviarlo a domini di terze parti. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Session).token();
  if (!token || req.context.get(SKIP_AUTH) || !req.url.startsWith('/api/')) return next(req);
  // HttpRequest è immutabile: clone() con setHeaders
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

function isTransient(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

/**
 * Retry con backoff esponenziale (300ms, 600ms, …) SOLO per GET e solo per errori transitori
 * (rete / 5xx): ripetere una POST potrebbe creare duplicati, ripetere un 404 è inutile.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const count = req.context.get(RETRY_COUNT);
  if (req.method !== 'GET' || count === 0) return next(req);

  const activity = inject(HttpActivity);
  return next(req).pipe(
    retry({
      count,
      delay: (error: unknown, attempt: number) => {
        if (!isTransient(error)) return throwError(() => error);
        const wait = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        activity.write(`↻ retry ${attempt}/${count} di ${req.urlWithParams} tra ${wait}ms`);
        return timer(wait);
      },
    }),
  );
};

/**
 * Interceptor di ordine superiore (solo per la demo sull'ordine): se la richiesta ha TRACE, scrive
 * "→ nome" alla subscribe (anche a ogni retry) e "← nome" / "✕ nome" quando risposta o errore la attraversano.
 */
export function traced(name: string, interceptor: HttpInterceptorFn): HttpInterceptorFn {
  return (req, next) => {
    if (!req.context.get(TRACE)) return interceptor(req, next);
    const activity = inject(HttpActivity);
    const response$ = interceptor(req, next); // chiamato qui: resta nell'injection context
    return defer(() => {
      activity.write(`→ ${name}`, 'trace');
      return response$;
    }).pipe(
      tap({
        next: (event) => {
          if (event.type === HttpEventType.Response) activity.write(`← ${name} (${event.status})`, 'trace');
        },
        error: () => activity.write(`✕ ${name}`, 'trace'),
      }),
    );
  };
}
