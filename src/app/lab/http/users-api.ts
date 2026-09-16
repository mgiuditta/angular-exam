import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
}

export type UserDraft = Omit<User, 'id'>;

/**
 * API tipizzata sugli utenti: i componenti non conoscono URL, verbi e header.
 *
 * Di solito sarebbe `@Injectable({ providedIn: 'root' })`. Qui NO: `providedIn: 'root'` crea l'istanza
 * nel root injector, dove `inject(HttpClient)` restituisce l'HttpClient ROOT (app.config.ts), che non ha
 * gli interceptor della pagina né il fake backend → le richieste andrebbero in rete. Per usare l'HttpClient
 * della route, il servizio va fornito nei `providers` della route (http.routes.ts).
 *
 * Tutti i metodi restituiscono Observable COLD: la richiesta parte solo alla subscribe.
 */
@Injectable()
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/users';
  private requestSeq = 0;

  /** GET con params in forma oggetto: HttpClient crea l'HttpParams. */
  list(query = ''): Observable<User[]> {
    return this.http.get<User[]>(this.url, { params: { q: query } });
  }

  /** HttpParams + HttpHeaders espliciti e `observe: 'response'` per leggere status e header. */
  page(page: number, pageSize: number): Observable<HttpResponse<User[]>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    const headers = new HttpHeaders().set('X-Request-Id', `sbu-${++this.requestSeq}`);
    return this.http.get<User[]>(this.url, { params, headers, observe: 'response' });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  create(draft: UserDraft): Observable<User> {
    return this.http.post<User>(this.url, draft);
  }

  /** PUT: sostituisce l'intera risorsa. */
  replace(user: User): Observable<User> {
    return this.http.put<User>(`${this.url}/${user.id}`, user);
  }

  /** PATCH: aggiorna solo i campi inviati. */
  rename(id: number, name: string): Observable<User> {
    return this.http.patch<User>(`${this.url}/${id}`, { name });
  }

  /** DELETE: il server risponde 204 senza body. */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
