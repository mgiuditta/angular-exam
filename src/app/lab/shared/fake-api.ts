import { Observable, map, timer } from 'rxjs';

const API_NAMES = [
  'signal', 'computed', 'effect', 'linkedSignal', 'resource', 'rxResource', 'httpResource',
  'toSignal', 'toObservable', 'takeUntilDestroyed', 'input', 'model', 'output', 'viewChild',
  'contentChild', 'inject', 'afterNextRender', 'afterRenderEffect', 'untracked',
];

/**
 * Finta ricerca HTTP (cold, lazy): latenza CASUALE 100-700ms.
 * Le risposte possono arrivare fuori ordine → serve switchMap per scartare quelle vecchie.
 */
export function fakeSearch(query: string): Observable<string[]> {
  const q = query.toLowerCase();
  return timer(100 + Math.random() * 600).pipe(map(() => API_NAMES.filter((name) => name.toLowerCase().includes(q))));
}

export interface FakeUser {
  readonly id: number;
  readonly name: string;
}

const USERS = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper'];

/**
 * Finta fetch basata su Promise (per `resource`). Rispetta `AbortSignal`: se i params cambiano
 * mentre carica, Angular abortisce la richiesta precedente.
 */
export function fakeFetchUser(id: number, abortSignal: AbortSignal): Promise<FakeUser> {
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      const name = USERS[id - 1];
      if (name) resolve({ id, name });
      else reject(new Error(`Utente ${id} non trovato`));
    }, 600);
    abortSignal.addEventListener('abort', () => {
      clearTimeout(handle);
      reject(abortSignal.reason);
    });
  });
}
