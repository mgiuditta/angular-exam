import { TestScheduler } from 'rxjs/testing';
import { ts } from '../shared/code-block';
import { OPERATOR_GROUPS, OperatorDemo } from './operators';

const demos = new Map<string, OperatorDemo>(OPERATOR_GROUPS.flatMap((group) => group.demos.map((demo) => [demo.name, demo])));

/** Esegue un demo in tempo VIRTUALE: interval/timer/delay/debounceTime usano il TestScheduler. */
function runDemo(name: string) {
  const values: unknown[] = [];
  const logs: string[] = [];
  let done: 'complete' | 'error' | undefined;
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(() => {
    demos
      .get(name)!
      .run((text) => logs.push(text))
      .subscribe({
        next: (value) => values.push(value),
        error: () => (done = 'error'),
        complete: () => (done = 'complete'),
      });
  });
  return { values, logs, done };
}

describe('Operatori RxJS', () => {
  const finite = [...demos.keys()].filter((name) => name !== 'fromEvent');

  it.each(finite)('%s termina', (name) => {
    expect(runDemo(name).done).toBeDefined();
  });

  it('snippet: ts toglie l’indentazione comune, ogni demo ha il suo codice', () => {
    expect(ts`
      a(
        b,
      )
    `).toBe('a(\n  b,\n)');
    expect(ts`of(1)`).toBe('of(1)');
    for (const demo of demos.values()) expect(demo.code).toContain(demo.name.split(/[ /]/)[0].replace('cold', 'merge'));
  });

  it('flattening: switchMap cancella, exhaustMap ignora', () => {
    expect(runDemo('switchMap').values).toEqual(['0.0', '0.1', '1.0', '1.1', '2.0', '2.1', '2.2', '2.3']);
    expect(runDemo('concatMap').values).toHaveLength(12);
    expect(runDemo('exhaustMap').values).toEqual(['0.0', '0.1', '0.2', '3.0', '3.1', '3.2']);
  });

  it('tempo: debounceTime aspetta il silenzio, throttleTime prende il primo', () => {
    expect(runDemo('debounceTime').values).toEqual(['ang', 'angular']);
    expect(runDemo('throttleTime').values).toEqual(['a', 'angu']);
    expect(runDemo('auditTime').values).toEqual(['ang', 'angular']);
  });

  it('multicasting: share e shareReplay eseguono la sorgente una volta', () => {
    expect(runDemo('cold (no share)').logs).toHaveLength(6);
    expect(runDemo('share').logs).toHaveLength(3);
    expect(runDemo('shareReplay')).toMatchObject({ values: ['risposta', 'risposta'], logs: ['"HTTP" eseguita'] });
  });

  it('subject: cosa riceve un subscriber in ritardo', () => {
    expect(runDemo('Subject').values).toEqual(['3', '4']);
    expect(runDemo('BehaviorSubject').values).toEqual(['2', '3', '4']);
    expect(runDemo('ReplaySubject').values).toEqual(['2', '3', '4']);
    expect(runDemo('AsyncSubject').values).toEqual(['4']);
  });

  it('retry riesce al terzo tentativo', () => {
    expect(runDemo('retry')).toMatchObject({ values: ['ok al tentativo 3'], done: 'complete' });
  });
});
