import { TestBed } from '@angular/core/testing';
import { describeValue, fallbacks, normalizeSettings, userInitial } from './basics';
import { toEmail, welcomeMessage } from './brands';
import { BankAccount, Calculator, Developer, runtimeView, runWithUsing, Stack } from './classes';
import { directionArrow, enumKeys, Priority, Status } from './enums';
import { createMachine, describeCounter, OPERATIONS, parseInput } from './functions';
import { area, checkWithAssertion, checkWithPredicate, narrowInput, PAYLOADS, trustWithAs } from './narrowing';
import { DEFAULT_USER, formatId, getProperty, translate, TRANSLATIONS_IT, withAudit } from './objects';
import { concatTuples, parseRange, rangeLength } from './tuples';
import TypescriptPage from './typescript.page';

describe('TypeScript: fondamenta', () => {
  it('la pagina si renderizza e reagisce ai click', async () => {
    const fixture = TestBed.createComponent(TypescriptPage);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('TypeScript: fondamenta');
    expect(element.querySelectorAll('sbu-example').length).toBe(22);

    for (const button of element.querySelectorAll<HTMLButtonElement>('button[type="button"]')) {
      button.click();
    }
    await fixture.whenStable();
    expect(element.textContent).toContain('chiudo db');
    fixture.destroy();
  });

  it('basics: unknown, || vs ??, assegnazioni logiche, ?.', () => {
    expect(describeValue(null)).toBe('null');
    expect(describeValue([1, 2])).toBe('array di 2 elementi');
    expect(describeValue({ a: 1 })).toBe('object con chiavi: a');
    expect(describeValue(Symbol('x'))).toBe('symbol');

    expect(fallbacks(0)).toEqual({ or: 'default', nullish: '0' });
    expect(fallbacks(null)).toEqual({ or: 'default', nullish: 'default' });

    const input = { pageSize: 0, title: '', user: { name: '  ada ' } };
    expect(normalizeSettings(input)).toEqual({ pageSize: 0, title: 'Senza titolo', user: { name: 'ada' } });
    expect(input.title).toBe(''); // input non mutato
    expect(normalizeSettings({ user: null })).toEqual({ pageSize: 20, title: 'Senza titolo', user: null });
    expect(userInitial({ user: { name: 'grace' } })).toBe('G');
    expect(userInitial({ user: null })).toBe('—');
  });

  it('oggetti, tuple ed enum', () => {
    expect(formatId(7)).toBe('#0007');
    expect(formatId('kb-01')).toBe('KB-01');
    expect(withAudit({ id: 1 }, 'ada', '10:00')).toEqual({ id: 1, updatedBy: 'ada', updatedAt: '10:00' });
    expect(translate(TRANSLATIONS_IT, 'save')).toBe('Salva');
    expect(translate(TRANSLATIONS_IT, 'missing')).toBe('[missing]');
    expect(getProperty(DEFAULT_USER, 'loginCount')).toBe(3);

    expect(parseRange('8-3')).toEqual([3, 8]);
    expect(parseRange('abc')).toBeNull();
    expect(rangeLength([3, 8])).toBe(6);
    expect(concatTuples([1, 'due'], [true])).toEqual([1, 'due', true]);

    expect(Priority[Priority.Critical]).toBe('Critical');
    expect(enumKeys(Priority)).toEqual(['0', '1', '10', '11', 'Low', 'Medium', 'High', 'Critical']);
    expect(enumKeys(Status)).toEqual(['Draft', 'Published']);
    expect(directionArrow(false)).toBe('↓ DOWN');
  });

  it('funzioni e generici', () => {
    expect(OPERATIONS.massimo(6, 7)).toBe(7);
    expect(parseInput('4')).toBe(4);
    expect(parseInput(['1', ' 2'])).toEqual([1, 2]);
    expect(describeCounter.call({ count: 3 }, 'click')).toBe('click: 3');

    const machine = createMachine(['idle', 'loading', 'done'], 'idle');
    expect([machine.next(), machine.next(), machine.next()]).toEqual(['loading', 'done', 'idle']);
  });

  it('narrowing, predicate e asserzioni', () => {
    expect(area({ kind: 'rectangle', width: 2, height: 3 })).toBe(6);
    expect(narrowInput(undefined)).toContain('null o undefined');
    expect(narrowInput(['a', 'b'])).toBe('array: a, b');
    expect(narrowInput({ label: 'ok' })).toContain('label "ok"');

    expect(checkWithPredicate(PAYLOADS.valido)).toBe('User: Ada, 36 anni');
    expect(checkWithPredicate(PAYLOADS.null)).toBe('non è un User');
    expect(checkWithAssertion(PAYLOADS['senza nome'])).toBe('TypeError: Non è un User valido');
    expect(trustWithAs(PAYLOADS['età stringa'])).toContain('3610'); // `as` non converte
    expect(trustWithAs(PAYLOADS['senza nome'])).toMatch(/^TypeError/);
  });

  it('classi, decoratori, using, brand', () => {
    const account = new BankAccount('Ada', 'IT00');
    account.deposit(50);
    expect(() => account.withdraw(80)).toThrow(RangeError);
    expect(account.movements).toHaveLength(1);
    expect(JSON.parse(runtimeView(account))).toEqual({ owner: 'Ada', iban: 'IT00', balance: 50, createdAt: expect.any(Number) });

    const developer = new Developer('Ada', 60000);
    developer.level = '9';
    expect(developer.level).toBe(3);
    expect(developer.describe()).toContain('(livello 3)');

    expect(new Stack<number>().push(1).push(2).pop()).toBe(2);

    const calculator = new Calculator();
    calculator.add(2, 3);
    expect(calculator.calls).toEqual(['add(2, 3) → 5']);

    expect(runWithUsing(false)).toEqual(['apro db', 'db: SELECT 1', 'fine blocco', 'chiudo db']);
    expect(runWithUsing(true)).toEqual(['apro db', 'db: SELECT 1', 'chiudo db', 'catch: query fallita']);

    const email = toEmail(' Ada@Example.com ');
    expect(email).toBe('ada@example.com');
    expect(email && welcomeMessage(email)).toContain('ada@example.com');
    expect(toEmail('non-valida')).toBeNull();
  });
});
