import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createProfileForm, readSignals } from './angular-types';
import { parseAge, parseAs } from './conditional-types';
import { defineTabs, getProp, pair } from './generic-functions';
import { groupBy, toGetters } from './mapped-types';
import { deepFreeze, getPath, mergeDeep } from './recursive-types';
import { type AppEvents, buildRoute, createEmitter, handlerName } from './template-literal-types';
import { mergeAll, sendWelcome, toEmail } from './type-helpers';
import { isRole, permissionsOf } from './type-operators';
import TypescriptTypesPage from './typescript-types.page';
import {
  Money,
  applyPatch,
  chooseOption,
  create,
  defineModel,
  discount,
  formatEur,
  formatPrice,
  isPresent,
  omit,
  pick,
  withLogging,
} from './utility-types';

/*
 * Le spec sono compilate con type-check: i `@ts-expect-error` qui sotto verificano gli errori
 * che si possono mostrare solo con una CHIAMATA (inferenza dagli argomenti).
 */

describe('TypeScript: pagina', () => {
  it('si renderizza senza provider e reagisce ai click', async () => {
    const fixture = TestBed.createComponent(TypescriptTypesPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('TypeScript: tipi avanzati e utility');
    expect(element.querySelectorAll('sbu-example').length).toBe(16);

    for (const button of Array.from(element.querySelectorAll<HTMLButtonElement>('button[type="button"]'))) {
      button.click();
    }
    await fixture.whenStable();
    expect(element.textContent).toContain('onUserLogin → benvenuto Ada');
    expect(element.textContent).toContain('discount(80, 25) → 60');
    fixture.destroy();
  });
});

describe('TypeScript: helper runtime', () => {
  it('isRole restringe una stringa e permissionsOf legge la mappa as const', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('owner')).toBe(false);
    expect(permissionsOf('editor')).toEqual(['read', 'write']);
  });

  it('pick, omit, applyPatch (incluso il caso undefined)', () => {
    const product = { id: 1, name: 'Tastiera', price: 10, description: 'x' };
    expect(pick(product, 'id', 'name')).toEqual({ id: 1, name: 'Tastiera' });
    expect(omit(product, 'description')).toEqual({ id: 1, name: 'Tastiera', price: 10 });
    expect(applyPatch(product, { price: 5 }).price).toBe(5);
    expect(applyPatch(product, { price: undefined }).price).toBeUndefined();
    // @ts-expect-error pick accetta solo chiavi esistenti
    pick(product, 'nmae');
  });

  it('isPresent filtra null e undefined', () => {
    const values: (number | null | undefined)[] = [1, null, 2, undefined];
    const present: number[] = values.filter(isPresent);
    expect(present).toEqual([1, 2]);
  });

  it('withLogging e create conservano le firme', () => {
    const lines: string[] = [];
    const logged = withLogging(discount, (line) => lines.push(line));
    expect(logged(80, 25)).toBe(60);
    expect(lines).toEqual(['discount(80, 25) → 60']);
    expect(create(Money, 42.5, 'USD').toString()).toBe('42.50 USD');
    // @ts-expect-error 'GBP' non è una valuta ammessa dal costruttore
    create(Money, 1, 'GBP');
  });

  it('this: bind rimuove il parametro this, ThisType tipizza i metodi', () => {
    expect(formatEur(1)).toContain('€');
    expect(formatPrice.call({ code: 'USD', locale: 'en-US' }, 2)).toBe('$2.00');
    // @ts-expect-error senza this: il contesto `void` non è un CurrencyFormat
    expect(() => formatPrice(1)).toThrow();

    const counter = defineModel({
      data: { count: 0 },
      methods: {
        increment() {
          return ++this.count;
        },
      },
    });
    expect(counter.increment()).toBe(1);
    expect(counter.count).toBe(1);
  });

  it('NoInfer: il fallback non allarga T', () => {
    const sizes = ['S', 'M', 'L'] as const;
    expect(chooseOption(sizes, 'L', 'M')).toBe('L');
    expect(chooseOption(sizes, 'XL', 'M')).toBe('M');
    // @ts-expect-error 'XL' non è tra le opzioni: con NoInfer T resta 'S' | 'M' | 'L'
    chooseOption(sizes, 'S', 'XL');

    // senza NoInfer il fallback è un candidato per T: T = 'S' | 'M' | 'L' | 'XL' e nessun errore
    const chooseLoose = <T extends string>(options: readonly T[], fallback: T): T => options[0] ?? fallback;
    const loose = chooseLoose(sizes, 'XL');
    const widened: 'S' | 'M' | 'L' | 'XL' = loose;
    // @ts-expect-error il ritorno include 'XL', non è più solo una taglia valida
    const strict: 'S' | 'M' | 'L' = loose;
    expect([widened, strict]).toEqual(['S', 'S']);
  });

  it('generici: getProp, const type parameter, inferenza da più argomenti', () => {
    const account = { id: 1, address: { city: 'Roma' } };
    expect(getProp(account, 'address').city).toBe('Roma');
    // @ts-expect-error 'phone' non è keyof
    getProp(account, 'phone');

    const tabs: readonly ['a', 'b'] = defineTabs(['a', 'b']);
    expect(tabs).toEqual(['a', 'b']);
    // senza `const`: lo stesso array letterale diventa string[] e non è assegnabile alla tupla
    const widen = <T extends readonly string[]>(value: T): T => value;
    const wide = widen(['a', 'b']); // string[]
    // @ts-expect-error string[] non è assegnabile a readonly ['a', 'b']
    const asTuple: readonly ['a', 'b'] = wide;
    expect(asTuple).toHaveLength(2);

    expect(pair(1, 2)).toEqual([1, 2]);
    // @ts-expect-error T è inferito dal primo argomento (number): 'x' non è assegnabile
    pair(1, 'x');
  });

  it('mapped types: groupBy su KeysOfType e toGetters', () => {
    const employees = [
      { id: 1, name: 'A', team: 'frontend' as const, seniority: 1, remote: true },
      { id: 2, name: 'B', team: 'backend' as const, seniority: 1, remote: false },
    ];
    const byTeam = groupBy(employees, 'team');
    expect(byTeam.frontend?.map((employee) => employee.name)).toEqual(['A']);
    expect(groupBy(employees, 'seniority')[1]).toHaveLength(2);
    // @ts-expect-error `remote` è boolean: esclusa da KeysOfType<T, string | number>
    groupBy(employees, 'remote');

    const getters = toGetters({ name: 'Ada', age: 36 });
    expect(getters.getName()).toBe('Ada');
    expect(getters.getAge()).toBe(36);
  });

  it('conditional types: parseAs e parseAge', () => {
    const list: string[] = parseAs('list', 'a, b,');
    expect(list).toEqual(['a', 'b']);
    expect(parseAs('boolean', ' TRUE ')).toBe(true);
    expect(parseAs('number', '3.5')).toBe(3.5);

    expect(parseAge('42')).toEqual({ ok: true, value: 42 });
    expect(parseAge('abc')).toEqual({ ok: false, error: 'non è un intero' });
    expect(parseAge('200')).toEqual({ ok: false, error: 'fuori intervallo 0–130' });
  });

  it('template literal: emitter tipizzato, handlerName, buildRoute', () => {
    const events = createEmitter<AppEvents>();
    const received: string[] = [];
    const off = events.on('userLogin', ({ name }) => received.push(name));
    events.emit('userLogin', { name: 'Ada' });
    off();
    events.emit('userLogin', { name: 'Bob' });
    expect(received).toEqual(['Ada']);
    // @ts-expect-error il payload di cartUpdated vuole items: number
    events.emit('cartUpdated', { items: '3' });
    // @ts-expect-error evento inesistente
    events.emit('userLogon', { name: 'x' });

    expect(handlerName('cartUpdated')).toBe('onCartUpdated');
    expect(buildRoute('/users/:id/posts/:postId', { id: '7', postId: 'a b' })).toBe('/users/7/posts/a%20b');
    // @ts-expect-error manca il parametro id
    buildRoute('/users/:id', {});
  });

  it('tipi ricorsivi: getPath, mergeDeep, deepFreeze', () => {
    const settings = deepFreeze({ theme: { mode: 'light' as 'light' | 'dark', accent: 'blue' }, language: 'it' });
    expect(Object.isFrozen(settings.theme)).toBe(true);
    expect(getPath(settings, 'theme.mode')).toBe('light');

    const merged = mergeDeep(settings, { theme: { mode: 'dark' } });
    expect(merged).toEqual({ theme: { mode: 'dark', accent: 'blue' }, language: 'it' });
    expect(settings.theme.mode).toBe('light');
    // @ts-expect-error percorso inesistente
    getPath(settings, 'theme.color');
    // @ts-expect-error DeepReadonly: anche le proprietà annidate sono readonly
    expect(() => (settings.theme.mode = 'dark')).toThrow();
  });

  it('brand e UnionToIntersection', () => {
    const email = toEmail(' ada@example.com ');
    expect(email).toBe('ada@example.com');
    expect(toEmail('ada@')).toBeNull();
    if (email) expect(sendWelcome(email)).toContain('ada@example.com');
    // @ts-expect-error una string non è una Email
    sendWelcome('ada@example.com');

    const merged = mergeAll({ id: 1 }, { name: 'Ada' });
    const typed: { id: number; name: string } = merged;
    expect(typed).toEqual({ id: 1, name: 'Ada' });
  });

  it('Angular: typed form e readSignals', () => {
    const form = createProfileForm();
    form.controls.email.disable();
    expect(form.value).toEqual({ name: '', newsletter: false });
    expect(form.getRawValue()).toEqual({ name: '', email: '', newsletter: false });
    form.reset();
    expect(form.getRawValue().email).toBeNull();
    // @ts-expect-error newsletter è boolean
    form.controls.newsletter.setValue('sì');

    const values: { a: number; b: string } = readSignals({ a: signal(1), b: signal('x') });
    expect(values).toEqual({ a: 1, b: 'x' });
  });
});
