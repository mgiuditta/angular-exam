import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { Routes } from '@angular/router';
import { FakeUsersDb, fakeBackendInterceptor } from './fake-backend';
import HttpPage from './http.page';
import { HttpActivity, Session } from './http-state';
import {
  authInterceptor,
  errorMappingInterceptor,
  loadingInterceptor,
  loggingInterceptor,
  retryInterceptor,
  traced,
} from './interceptors';
import { UsersApi } from './users-api';

/**
 * Provider della pagina HTTP, esportati anche per i test.
 *
 * `provideHttpClient` in una route crea un HttpClient SEPARATO nell'environment injector della route:
 * gli interceptor della root (app.config.ts) NON vengono ereditati (HTTP_INTERCEPTOR_FNS è un multi
 * provider: il figlio ha la sua lista). Per passare anche dalla catena del padre: `withRequestsMadeViaParent()`.
 *
 * Ordine: la richiesta attraversa gli interceptor nell'ordine dell'array, la risposta in ordine inverso.
 */
export const HTTP_PAGE_PROVIDERS: (Provider | EnvironmentProviders)[] = [
  provideHttpClient(
    withInterceptors([
      traced('errorMapping', errorMappingInterceptor),
      traced('logging', loggingInterceptor),
      traced('loading', loadingInterceptor),
      traced('auth', authInterceptor),
      traced('retry', retryInterceptor),
      traced('fakeBackend', fakeBackendInterceptor), // ultimo: risponde al posto della rete
    ]),
  ),
  HttpActivity,
  Session,
  FakeUsersDb,
  UsersApi, // deve stare QUI per ricevere l'HttpClient della route (vedi users-api.ts)
];

export default [{ path: '', component: HttpPage, providers: HTTP_PAGE_PROVIDERS }] satisfies Routes;
