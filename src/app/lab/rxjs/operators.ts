import {
  AsyncSubject,
  BehaviorSubject,
  EMPTY,
  Observable,
  ReplaySubject,
  Subject,
  auditTime,
  bufferCount,
  bufferTime,
  catchError,
  combineLatest,
  concat,
  concatAll,
  concatMap,
  count,
  debounceTime,
  defaultIfEmpty,
  defer,
  delay,
  distinct,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  elementAt,
  endWith,
  every,
  exhaustMap,
  expand,
  filter,
  finalize,
  first,
  forkJoin,
  from,
  fromEvent,
  groupBy,
  ignoreElements,
  iif,
  interval,
  last,
  map,
  merge,
  mergeMap,
  of,
  pairwise,
  race,
  range,
  reduce,
  retry,
  sampleTime,
  scan,
  share,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  tap,
  throttleTime,
  throwError,
  timeout,
  timer,
  toArray,
  withLatestFrom,
  zip,
} from 'rxjs';
import { ts } from '../shared/code-block';

export interface OperatorDemo {
  readonly name: string;
  readonly description: string;
  /** Corpo di `run`, mostrato in pagina. Generato dal sorgente: se modifichi `run`, aggiornalo. */
  readonly code: string;
  /** `log` serve ai demo che devono mostrare side effect (tap, finalize, share…). */
  readonly run: (log: (text: string) => void) => Observable<unknown>;
}

export interface OperatorGroup {
  readonly title: string;
  readonly level: 'base' | 'intermedio' | 'avanzato';
  readonly note: string;
  readonly demos: readonly OperatorDemo[];
}

/** 0, 1, 2… ogni `ms`, per `count` valori, poi completa. Sorgente "lenta" usata quasi ovunque. */
const ticks = (ms: number, count = 5) => interval(ms).pipe(take(count));

/** Finta chiamata HTTP: emette `value` dopo `ms` e completa (come HttpClient). */
const fakeRequest = <T>(value: T, ms = 300) => timer(ms).pipe(map(() => value));

/** Simula un utente che digita: raffica, pausa di ~500ms, raffica. */
const keystrokes: [number, string][] = [
  [0, 'a'],
  [80, 'an'],
  [160, 'ang'],
  [700, 'angu'],
  [780, 'angul'],
  [860, 'angular'],
];
const typing = () => merge(...keystrokes.map(([ms, text]) => timer(ms).pipe(map(() => text))));

/** Emette `before` PRIMA di iscriversi, poi `after`, poi completa: cosa riceve un subscriber in ritardo? */
const lateSubscriber = (subject: Subject<string>, before: string[], after: string[]) =>
  new Observable<string>((subscriber) => {
    before.forEach((value) => subject.next(value));
    const subscription = subject.subscribe(subscriber);
    after.forEach((value) => subject.next(value));
    subject.complete();
    return subscription;
  });

/** Gli helper qui sopra, mostrati in pagina perché compaiono negli snippet. */
export const HELPERS_CODE = ts`
  // 0, 1, 2… ogni ms, per count valori, poi completa
  const ticks = (ms: number, count = 5) => interval(ms).pipe(take(count));

  // finta HTTP: emette value dopo ms e completa
  const fakeRequest = <T>(value: T, ms = 300) => timer(ms).pipe(map(() => value));

  // digitazione simulata: 'a' 'an' 'ang' (0-160ms) … pausa … 'angu' 'angul' 'angular' (700-860ms)
  const typing = () => merge(...keystrokes.map(([ms, text]) => timer(ms).pipe(map(() => text))));

  // next(before) → subscribe → next(after) → complete
  const lateSubscriber = (subject: Subject<string>, before: string[], after: string[]) =>
    new Observable<string>((subscriber) => {
      before.forEach((value) => subject.next(value));
      const subscription = subject.subscribe(subscriber);
      after.forEach((value) => subject.next(value));
      subject.complete();
      return subscription;
    });
`;

export const OPERATOR_GROUPS: readonly OperatorGroup[] = [
  {
    title: 'Creazione',
    level: 'base',
    note: 'Tutte creano Observable COLD: non succede nulla finché qualcuno non fa subscribe, e ogni subscriber ha la sua esecuzione.',
    demos: [
      {
        name: 'of',
        description: 'of(1, 2, 3): emette gli argomenti in SINCRONO e completa.',
        code: ts`of(1, 2, 3)`,
        run: () => of(1, 2, 3),
      },
      {
        name: 'from',
        description: "from(array | Promise | iterable | Observable): converte. Un array emette un valore per elemento.",
        code: ts`from(['a', 'b', 'c'])`,
        run: () => from(['a', 'b', 'c']),
      },
      {
        name: 'interval',
        description: 'interval(300): 0, 1, 2… all’infinito. Non completa mai: qui take(5) lo chiude.',
        code: ts`interval(300).pipe(take(5))`,
        run: () => interval(300).pipe(take(5)),
      },
      {
        name: 'timer',
        description: 'timer(500, 300): primo valore dopo 500ms, poi ogni 300ms. timer(ms) da solo emette 0 e completa.',
        code: ts`timer(500, 300).pipe(take(4))`,
        run: () => timer(500, 300).pipe(take(4)),
      },
      {
        name: 'range',
        description: 'range(1, 5): 1…5 in sincrono.',
        code: ts`range(1, 5)`,
        run: () => range(1, 5),
      },
      {
        name: 'defer',
        description: 'defer(factory): la factory gira A OGNI subscribe. Rende lazy codice eager (es. una Promise).',
        code: ts`defer(() => of(\`creato alle \${new Date().toLocaleTimeString()}\`))`,
        run: () => defer(() => of(`creato alle ${new Date().toLocaleTimeString()}`)),
      },
      {
        name: 'iif',
        description: 'iif(cond, a, b): sceglie la sorgente AL MOMENTO del subscribe. Riesegui più volte.',
        code: ts`iif(() => Math.random() > 0.5, of('testa'), of('croce'))`,
        run: () => iif(() => Math.random() > 0.5, of('testa'), of('croce')),
      },
      {
        name: 'throwError',
        description: 'throwError(() => err): emette subito un errore. Si passa una factory, non l’errore.',
        code: ts`throwError(() => new Error('boom'))`,
        run: () => throwError(() => new Error('boom')),
      },
      {
        name: 'EMPTY',
        description: 'EMPTY: completa subito senza valori.',
        code: ts`EMPTY`,
        run: () => EMPTY,
      },
      {
        name: 'fromEvent',
        description: 'fromEvent(target, evento): premi 3 tasti qualsiasi. removeEventListener all’unsubscribe.',
        code: ts`
          fromEvent<KeyboardEvent>(document, 'keydown').pipe(
            take(3),
            map((event) => event.key),
          )
        `,
        run: () =>
          fromEvent<KeyboardEvent>(document, 'keydown').pipe(
            take(3),
            map((event) => event.key),
          ),
      },
    ],
  },
  {
    title: 'Trasformazione',
    level: 'intermedio',
    note: 'Gli operatori *Map proiettano ogni valore in un Observable interno: la differenza è COSA fanno se arriva un nuovo valore mentre l’interno è ancora attivo.',
    demos: [
      {
        name: 'map',
        description: 'map(fn): trasforma ogni valore.',
        code: ts`of(1, 2, 3).pipe(map((n) => n * 10))`,
        run: () => of(1, 2, 3).pipe(map((n) => n * 10)),
      },
      {
        name: 'scan',
        description: 'scan(acc, seed): come reduce ma emette OGNI accumulo. Base per stato stile Redux.',
        code: ts`of(1, 2, 3, 4).pipe(scan((acc, n) => acc + n, 0))`,
        run: () => of(1, 2, 3, 4).pipe(scan((acc, n) => acc + n, 0)),
      },
      {
        name: 'reduce',
        description: 'reduce(acc, seed): emette SOLO il risultato finale, alla complete.',
        code: ts`of(1, 2, 3, 4).pipe(reduce((acc, n) => acc + n, 0))`,
        run: () => of(1, 2, 3, 4).pipe(reduce((acc, n) => acc + n, 0)),
      },
      {
        name: 'pairwise',
        description: 'pairwise(): [precedente, corrente].',
        code: ts`of(1, 2, 4, 7).pipe(pairwise())`,
        run: () => of(1, 2, 4, 7).pipe(pairwise()),
      },
      {
        name: 'bufferCount',
        description: 'bufferCount(3): raggruppa in array da 3 (l’ultimo può essere più corto).',
        code: ts`ticks(150, 7).pipe(bufferCount(3))`,
        run: () => ticks(150, 7).pipe(bufferCount(3)),
      },
      {
        name: 'bufferTime',
        description: 'bufferTime(500): raggruppa tutto ciò che arriva in finestre da 500ms.',
        code: ts`ticks(150, 8).pipe(bufferTime(500))`,
        run: () => ticks(150, 8).pipe(bufferTime(500)),
      },
      {
        name: 'toArray',
        description: 'toArray(): un solo array alla complete. Con sorgenti infinite non emette mai.',
        code: ts`ticks(100, 4).pipe(toArray())`,
        run: () => ticks(100, 4).pipe(toArray()),
      },
      {
        name: 'switchMap',
        description: 'switchMap: nuovo valore esterno → CANCELLA l’interno precedente. Ricerche, navigazione.',
        code: ts`ticks(400, 3).pipe(switchMap((i) => ticks(150, 4).pipe(map((j) => \`\${i}.\${j}\`))))`,
        run: () => ticks(400, 3).pipe(switchMap((i) => ticks(150, 4).pipe(map((j) => `${i}.${j}`)))),
      },
      {
        name: 'mergeMap',
        description: 'mergeMap: tutti gli interni in PARALLELO, output mescolato. Operazioni indipendenti.',
        code: ts`ticks(400, 3).pipe(mergeMap((i) => ticks(150, 4).pipe(map((j) => \`\${i}.\${j}\`))))`,
        run: () => ticks(400, 3).pipe(mergeMap((i) => ticks(150, 4).pipe(map((j) => `${i}.${j}`)))),
      },
      {
        name: 'concatMap',
        description: 'concatMap: interni in CODA, uno alla volta, ordine garantito. Salvataggi sequenziali.',
        code: ts`ticks(400, 3).pipe(concatMap((i) => ticks(150, 4).pipe(map((j) => \`\${i}.\${j}\`))))`,
        run: () => ticks(400, 3).pipe(concatMap((i) => ticks(150, 4).pipe(map((j) => `${i}.${j}`)))),
      },
      {
        name: 'exhaustMap',
        description: 'exhaustMap: IGNORA i nuovi valori finché l’interno è attivo. Anti doppio-click su "Login".',
        code: ts`ticks(250, 6).pipe(exhaustMap((i) => ticks(200, 3).pipe(map((j) => \`\${i}.\${j}\`))))`,
        run: () => ticks(250, 6).pipe(exhaustMap((i) => ticks(200, 3).pipe(map((j) => `${i}.${j}`)))),
      },
      {
        name: 'concatAll',
        description: 'concatAll / mergeAll / switchAll: appiattiscono un Observable di Observable (= *Map senza proiezione).',
        code: ts`
                   of(ticks(100, 2).pipe(map((n) => \`A\${n}\`)), ticks(100, 2).pipe(map((n) => \`B\${n}\`))).pipe(concatAll())
        `,
        run: () => of(ticks(100, 2).pipe(map((n) => `A${n}`)), ticks(100, 2).pipe(map((n) => `B${n}`))).pipe(concatAll()),
      },
      {
        name: 'expand',
        description: 'expand(fn): ricorsivo, riapplica fn a ogni output. Paginazione "carica finché c’è next".',
        code: ts`of(1).pipe(expand((n) => (n < 64 ? of(n * 2) : EMPTY)))`,
        run: () => of(1).pipe(expand((n) => (n < 64 ? of(n * 2) : EMPTY))),
      },
      {
        name: 'groupBy',
        description: 'groupBy(key): un Observable per gruppo (GroupedObservable con .key).',
        code: ts`
          of('mela', 'banana', 'mirtillo', 'bacca', 'kiwi').pipe(
            groupBy((fruit) => fruit[0]),
            mergeMap((group) => group.pipe(toArray(), map((items) => \`\${group.key}: \${items.join(', ')}\`))),
          )
        `,
        run: () =>
          of('mela', 'banana', 'mirtillo', 'bacca', 'kiwi').pipe(
            groupBy((fruit) => fruit[0]),
            mergeMap((group) => group.pipe(toArray(), map((items) => `${group.key}: ${items.join(', ')}`))),
          ),
      },
    ],
  },
  {
    title: 'Filtro e tempo',
    level: 'intermedio',
    note: 'debounce = aspetta il silenzio (ultimo valore). throttle = primo valore poi pausa. audit = pausa poi ultimo valore. sample = campiona a intervalli fissi.',
    demos: [
      {
        name: 'filter',
        description: 'filter(pred): lascia passare solo i valori che rispettano il predicato.',
        code: ts`range(1, 10).pipe(filter((n) => n % 2 === 0))`,
        run: () => range(1, 10).pipe(filter((n) => n % 2 === 0)),
      },
      {
        name: 'take',
        description: 'take(3): primi 3 valori poi COMPLETA (e fa unsubscribe dalla sorgente).',
        code: ts`interval(200).pipe(take(3))`,
        run: () => interval(200).pipe(take(3)),
      },
      {
        name: 'takeWhile',
        description: 'takeWhile(pred, inclusive): completa al primo valore che fallisce. Con true emette anche quello.',
        code: ts`interval(150).pipe(takeWhile((n) => n < 4, true))`,
        run: () => interval(150).pipe(takeWhile((n) => n < 4, true)),
      },
      {
        name: 'takeUntil',
        description: 'takeUntil(notifier$): completa quando notifier emette. Va messo per ULTIMO nella pipe.',
        code: ts`interval(100).pipe(takeUntil(timer(550)))`,
        run: () => interval(100).pipe(takeUntil(timer(550))),
      },
      {
        name: 'skip',
        description: 'skip(3): ignora i primi 3.',
        code: ts`range(1, 6).pipe(skip(3))`,
        run: () => range(1, 6).pipe(skip(3)),
      },
      {
        name: 'first',
        description: 'first(pred?): primo valore (che rispetta pred) e completa. EmptyError se non arriva nulla.',
        code: ts`range(1, 10).pipe(first((n) => n > 3))`,
        run: () => range(1, 10).pipe(first((n) => n > 3)),
      },
      {
        name: 'last',
        description: 'last(): ultimo valore, alla complete.',
        code: ts`range(1, 5).pipe(last())`,
        run: () => range(1, 5).pipe(last()),
      },
      {
        name: 'elementAt',
        description: 'elementAt(1): valore all’indice 1.',
        code: ts`of('a', 'b', 'c').pipe(elementAt(1))`,
        run: () => of('a', 'b', 'c').pipe(elementAt(1)),
      },
      {
        name: 'distinct',
        description: 'distinct(): mai valori già visti (tiene un Set: attenzione alla memoria).',
        code: ts`of(1, 2, 1, 3, 2).pipe(distinct())`,
        run: () => of(1, 2, 1, 3, 2).pipe(distinct()),
      },
      {
        name: 'distinctUntilChanged',
        description: 'distinctUntilChanged(): scarta solo i duplicati CONSECUTIVI (===). Come l’equal dei signal.',
        code: ts`of(1, 1, 2, 2, 1, 3).pipe(distinctUntilChanged())`,
        run: () => of(1, 1, 2, 2, 1, 3).pipe(distinctUntilChanged()),
      },
      {
        name: 'distinctUntilKeyChanged',
        description: "distinctUntilKeyChanged('id'): consecutivi confrontati su una proprietà.",
        code: ts`
          of({ id: 1, v: 'a' }, { id: 1, v: 'b' }, { id: 2, v: 'c' }).pipe(
            distinctUntilKeyChanged('id'),
            map((item) => item.v),
          )
        `,
        run: () =>
          of({ id: 1, v: 'a' }, { id: 1, v: 'b' }, { id: 2, v: 'c' }).pipe(
            distinctUntilKeyChanged('id'),
            map((item) => item.v),
          ),
      },
      {
        name: 'debounceTime',
        description: 'debounceTime(300) su digitazione simulata: emette dopo 300ms di SILENZIO → "ang", "angular".',
        code: ts`typing().pipe(debounceTime(300))`,
        run: () => typing().pipe(debounceTime(300)),
      },
      {
        name: 'throttleTime',
        description: 'throttleTime(300): emette il PRIMO, poi ignora per 300ms.',
        code: ts`typing().pipe(throttleTime(300))`,
        run: () => typing().pipe(throttleTime(300)),
      },
      {
        name: 'auditTime',
        description: 'auditTime(300): al primo valore apre una finestra di 300ms, poi emette l’ULTIMO.',
        code: ts`typing().pipe(auditTime(300))`,
        run: () => typing().pipe(auditTime(300)),
      },
      {
        name: 'sampleTime',
        description: 'sampleTime(250): ogni 250ms emette l’ultimo valore, se ne è arrivato uno nuovo.',
        code: ts`typing().pipe(sampleTime(250))`,
        run: () => typing().pipe(sampleTime(250)),
      },
      {
        name: 'ignoreElements',
        description: 'ignoreElements(): solo complete/error. Utile quando interessa "quando finisce".',
        code: ts`ticks(100, 3).pipe(ignoreElements())`,
        run: () => ticks(100, 3).pipe(ignoreElements()),
      },
    ],
  },
  {
    title: 'Combinazione',
    level: 'intermedio',
    note: 'Esistono versioni pipeable: combineLatestWith, mergeWith, concatWith, zipWith, raceWith.',
    demos: [
      {
        name: 'combineLatest',
        description: 'combineLatest([a$, b$]): quando QUALSIASI emette → ultimi valori di tutti. Serve che tutti abbiano emesso almeno una volta.',
        code: ts`combineLatest([ticks(300, 3), ticks(500, 2)])`,
        run: () => combineLatest([ticks(300, 3), ticks(500, 2)]),
      },
      {
        name: 'withLatestFrom',
        description: 'a$.pipe(withLatestFrom(b$)): solo a$ fa emettere; b$ fornisce l’ultimo valore. Es. click + stato form.',
        code: ts`ticks(400, 3).pipe(withLatestFrom(ticks(150, 10)))`,
        run: () => ticks(400, 3).pipe(withLatestFrom(ticks(150, 10))),
      },
      {
        name: 'forkJoin',
        description: 'forkJoin({...}): aspetta che TUTTI completino, emette gli ultimi valori. Come Promise.all. Se uno non emette nulla → completa senza valori.',
        code: ts`forkJoin({ user: fakeRequest('Ada', 300), roles: fakeRequest(['admin'], 600) })`,
        run: () => forkJoin({ user: fakeRequest('Ada', 300), roles: fakeRequest(['admin'], 600) }),
      },
      {
        name: 'zip',
        description: 'zip(a$, b$): accoppia per INDICE (1° con 1°, 2° con 2°). Completa col più corto.',
        code: ts`zip(of('a', 'b', 'c'), ticks(300))`,
        run: () => zip(of('a', 'b', 'c'), ticks(300)),
      },
      {
        name: 'merge',
        description: 'merge(a$, b$): tutti i valori appena arrivano, interlacciati.',
        code: ts`
                   merge(ticks(200, 3).pipe(map((n) => \`A\${n}\`)), ticks(300, 3).pipe(map((n) => \`B\${n}\`)))
        `,
        run: () => merge(ticks(200, 3).pipe(map((n) => `A${n}`)), ticks(300, 3).pipe(map((n) => `B${n}`))),
      },
      {
        name: 'concat',
        description: 'concat(a$, b$): si iscrive a b$ solo quando a$ completa.',
        code: ts`concat(of('prima'), fakeRequest('poi la "HTTP"', 400), of('fine'))`,
        run: () => concat(of('prima'), fakeRequest('poi la "HTTP"', 400), of('fine')),
      },
      {
        name: 'race',
        description: 'race(a$, b$): vince il primo che emette, gli altri vengono cancellati.',
        code: ts`race(fakeRequest('lento', 600), fakeRequest('veloce', 200))`,
        run: () => race(fakeRequest('lento', 600), fakeRequest('veloce', 200)),
      },
      {
        name: 'startWith/endWith',
        description: 'startWith(v): valore iniziale sincrono (es. stato "loading"). endWith(v): valore prima della complete.',
        code: ts`fakeRequest('dati', 400).pipe(startWith('caricamento…'), endWith('fine'))`,
        run: () => fakeRequest('dati', 400).pipe(startWith('caricamento…'), endWith('fine')),
      },
    ],
  },
  {
    title: 'Errori',
    level: 'intermedio',
    note: 'Dopo un error lo stream è MORTO. catchError lo sostituisce con un altro Observable; dentro uno switchMap mettilo sull’interno per non uccidere l’esterno.',
    demos: [
      {
        name: 'catchError',
        description: 'catchError(err => fallback$): intercetta l’errore e continua con fallback$ (poi completa).',
        code: ts`
          concat(of(1, 2), throwError(() => new Error('boom'))).pipe(
            catchError((error: Error) => of(\`fallback per "\${error.message}"\`)),
          )
        `,
        run: () =>
          concat(of(1, 2), throwError(() => new Error('boom'))).pipe(
            catchError((error: Error) => of(`fallback per "${error.message}"`)),
          ),
      },
      {
        name: 'retry',
        description: 'retry({ count, delay }): alla prima error si RI-ISCRIVE (la sorgente cold riparte). Qui riesce al 3° tentativo.',
        code: ts`
          let attempt = 0;
          return defer(() => {
            attempt++;
            log(\`tentativo \${attempt}\`);
            return attempt < 3 ? throwError(() => new Error(\`fallito \${attempt}\`)) : of(\`ok al tentativo \${attempt}\`);
          }).pipe(retry({ count: 3, delay: 200 }));
        `,
        run: (log) => {
          let attempt = 0;
          return defer(() => {
            attempt++;
            log(`tentativo ${attempt}`);
            return attempt < 3 ? throwError(() => new Error(`fallito ${attempt}`)) : of(`ok al tentativo ${attempt}`);
          }).pipe(retry({ count: 3, delay: 200 }));
        },
      },
      {
        name: 'timeout',
        description: 'timeout({ first, with }): se il primo valore non arriva in tempo → with (default: TimeoutError).',
        code: ts`
                   fakeRequest('troppo tardi', 800).pipe(timeout({ first: 300, with: () => of('timeout → fallback') }))
        `,
        run: () => fakeRequest('troppo tardi', 800).pipe(timeout({ first: 300, with: () => of('timeout → fallback') })),
      },
      {
        name: 'defaultIfEmpty',
        description: 'defaultIfEmpty(v): se completa senza valori emette v. (throwIfEmpty: lancia invece.)',
        code: ts`EMPTY.pipe(defaultIfEmpty('vuoto!'))`,
        run: () => EMPTY.pipe(defaultIfEmpty('vuoto!')),
      },
    ],
  },
  {
    title: 'Utility e multicasting',
    level: 'avanzato',
    note: 'share/shareReplay trasformano un Observable COLD in HOT: una sola esecuzione condivisa tra più subscriber.',
    demos: [
      {
        name: 'tap',
        description: 'tap(fn): side effect (log, debug) senza cambiare i valori.',
        code: ts`of(1, 2).pipe(tap((n) => log(\`tap vede \${n}\`)), map((n) => n * 2))`,
        run: (log) => of(1, 2).pipe(tap((n) => log(`tap vede ${n}`)), map((n) => n * 2)),
      },
      {
        name: 'delay',
        description: 'delay(500): sposta ogni valore avanti nel tempo.',
        code: ts`of('dopo 500ms').pipe(delay(500))`,
        run: () => of('dopo 500ms').pipe(delay(500)),
      },
      {
        name: 'finalize',
        description: 'finalize(fn): gira a complete, error O unsubscribe. Il "finally" degli stream (es. spegnere spinner).',
        code: ts`ticks(100, 3).pipe(finalize(() => log('finalize eseguito')))`,
        run: (log) => ticks(100, 3).pipe(finalize(() => log('finalize eseguito'))),
      },
      {
        name: 'count/every',
        description: 'count(pred): quanti valori. every(pred): true/false alla complete (false appena uno fallisce).',
        code: ts`
                   concat(range(1, 5).pipe(count((n) => n % 2 === 0)), range(1, 5).pipe(every((n) => n > 0)))
        `,
        run: () => concat(range(1, 5).pipe(count((n) => n % 2 === 0)), range(1, 5).pipe(every((n) => n > 0))),
      },
      {
        name: 'cold (no share)',
        description: 'Due subscriber a un Observable cold → la sorgente gira DUE volte ("produce" appare 6 volte).',
        code: ts`
          const source = ticks(200, 3).pipe(tap((n) => log(\`produce \${n}\`)));
          return merge(source.pipe(map((n) => \`A:\${n}\`)), source.pipe(map((n) => \`B:\${n}\`)));
        `,
        run: (log) => {
          const source = ticks(200, 3).pipe(tap((n) => log(`produce ${n}`)));
          return merge(source.pipe(map((n) => `A:${n}`)), source.pipe(map((n) => `B:${n}`)));
        },
      },
      {
        name: 'share',
        description: 'share(): un’unica esecuzione condivisa ("produce" 3 volte). Chi arriva tardi perde i valori passati.',
        code: ts`
          const source = ticks(200, 3).pipe(
            tap((n) => log(\`produce \${n}\`)),
            share(),
          );
          return merge(source.pipe(map((n) => \`A:\${n}\`)), source.pipe(map((n) => \`B:\${n}\`)));
        `,
        run: (log) => {
          const source = ticks(200, 3).pipe(
            tap((n) => log(`produce ${n}`)),
            share(),
          );
          return merge(source.pipe(map((n) => `A:${n}`)), source.pipe(map((n) => `B:${n}`)));
        },
      },
      {
        name: 'shareReplay',
        description: 'shareReplay({ bufferSize: 1, refCount }): condivide E rigioca l’ultimo valore ai subscriber tardivi. Cache di una HTTP.',
        code: ts`
          const cached = fakeRequest('risposta', 300).pipe(
            tap(() => log('"HTTP" eseguita')),
            shareReplay({ bufferSize: 1, refCount: false }),
          );
          return concat(cached, timer(500).pipe(switchMap(() => cached)));
        `,
        run: (log) => {
          const cached = fakeRequest('risposta', 300).pipe(
            tap(() => log('"HTTP" eseguita')),
            shareReplay({ bufferSize: 1, refCount: false }),
          );
          return concat(cached, timer(500).pipe(switchMap(() => cached)));
        },
      },
    ],
  },
  {
    title: 'Subject',
    level: 'avanzato',
    note: 'Subject = Observable + Observer: puoi chiamare next() da fuori. Esponi sempre subject.asObservable(). Ogni demo emette "1","2" prima del subscribe e "3","4" dopo.',
    demos: [
      {
        name: 'Subject',
        description: 'Nessuna memoria: chi si iscrive dopo riceve solo i valori futuri → 3, 4.',
        code: ts`lateSubscriber(new Subject<string>(), ['1', '2'], ['3', '4'])`,
        run: () => lateSubscriber(new Subject<string>(), ['1', '2'], ['3', '4']),
      },
      {
        name: 'BehaviorSubject',
        description: 'Valore iniziale obbligatorio + ultimo valore al subscribe → 2, 3, 4. Ha .value sincrono. Il "signal" di RxJS.',
        code: ts`lateSubscriber(new BehaviorSubject('iniziale'), ['1', '2'], ['3', '4'])`,
        run: () => lateSubscriber(new BehaviorSubject('iniziale'), ['1', '2'], ['3', '4']),
      },
      {
        name: 'ReplaySubject',
        description: 'ReplaySubject(n): rigioca gli ultimi n valori → con n=1: 2, 3, 4.',
        code: ts`lateSubscriber(new ReplaySubject<string>(1), ['1', '2'], ['3', '4'])`,
        run: () => lateSubscriber(new ReplaySubject<string>(1), ['1', '2'], ['3', '4']),
      },
      {
        name: 'AsyncSubject',
        description: 'Emette SOLO l’ultimo valore e solo alla complete → 4.',
        code: ts`lateSubscriber(new AsyncSubject<string>(), ['1', '2'], ['3', '4'])`,
        run: () => lateSubscriber(new AsyncSubject<string>(), ['1', '2'], ['3', '4']),
      },
    ],
  },
];
