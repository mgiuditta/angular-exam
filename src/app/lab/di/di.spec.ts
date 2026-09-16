import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AliasDemo } from './alias-demo';
import { APP_CONFIG, GREETING } from './app-config';
import { LocalCounterCard, SharedCounterCard } from './counter-card';
import { CounterStore } from './counter-store';
import { DiLog } from './di-log';
import DiPage from './di.page';
import { provideLabFeature } from './feature';
import { injectDiLog } from './injection-context-demo';
import { LOGGER_COPY, Logger, MemoryLogger } from './logger';
import { NodeTokens } from './node-tokens';
import { PASSWORD_RULES } from './password-rules';
import { PasswordChecker } from './password-checker';
import { RecipesDemo } from './recipes-demo';
import { ScopeDirective } from './scope';
import { ScopeBoundary } from './scope-boundary';
import { ScopeProbe } from './scope-probe';
import { TokenDemo } from './token-demo';
import { TokenReader } from './token-reader';
import { PAGE_SIZE } from './tokens';
import { ViewProvidersPanel } from './view-providers-panel';

@Component({
  imports: [ScopeDirective, ScopeProbe, ScopeBoundary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div sbuDiScope="esterno">
      <sbu-di-scope-probe id="same" sbuDiScope="interno" label="stesso elemento" />
      <sbu-di-scope-boundary />
    </div>
    <sbu-di-scope-probe id="outside" label="fuori" />
  `,
})
class ScopeHost {}

@Component({
  imports: [ViewProvidersPanel, TokenReader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sbu-di-view-providers-panel>
      <sbu-di-token-reader id="projected" label="proiettato" />
    </sbu-di-view-providers-panel>
  `,
})
class PanelHost {}

@Component({
  imports: [NodeTokens],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sbu-di-node-tokens variant="compatto" />`,
})
class NodeTokensHost {}

/** Testi delle celle <dd>/<td> di un elemento, in ordine. */
function cells(element: Element, selector: string): string[] {
  return Array.from(element.querySelectorAll(selector), (cell) => cell.textContent?.trim() ?? '');
}

describe('Dependency injection', () => {
  it('la pagina si renderizza senza provider extra e sopravvive ai click', async () => {
    const fixture = TestBed.createComponent(DiPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Dependency injection');
    for (const button of fixture.nativeElement.querySelectorAll('button[type="button"]')) {
      (button as HTMLButtonElement).click();
    }
    await fixture.whenStable();
    fixture.destroy();
  });

  it('providedIn root: singleton condiviso; providers del componente: un’istanza per card', async () => {
    const fixture = TestBed.createComponent(DiPage);
    await fixture.whenStable();
    const store = (directive: typeof SharedCounterCard | typeof LocalCounterCard) =>
      fixture.debugElement.queryAll(By.directive(directive)).map((de) => de.injector.get(CounterStore));

    const [sharedA, sharedB] = store(SharedCounterCard);
    const [localC, localD] = store(LocalCounterCard);
    expect(sharedA).toBe(sharedB);
    expect(sharedA).toBe(TestBed.inject(CounterStore));
    expect(localC).not.toBe(localD);
    expect(localC).not.toBe(sharedA);

    // distruggendo le card locali muoiono le loro istanze, quella root no
    const toggle = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.includes('card locali'),
    )!;
    toggle.click();
    await fixture.whenStable();
    const entries = TestBed.inject(DiLog).entries();
    expect(entries).toContain(`${localC.id} distrutto`);
    expect(entries).toContain(`${localD.id} distrutto`);
    expect(entries).not.toContain(`${sharedA.id} distrutto`);
  });

  it('inject() fuori contesto lancia NG0203, runInInjectionContext no', () => {
    expect(() => injectDiLog()).toThrow(/NG0203/);
    expect(TestBed.runInInjectionContext(() => injectDiLog())).toBe(TestBed.inject(DiLog));
  });

  it('useExisting è un alias, useClass crea un’altra istanza', async () => {
    const fixture = TestBed.createComponent(AliasDemo);
    await fixture.whenStable();
    const injector = fixture.debugElement.injector;
    expect(injector.get(Logger)).toBe(injector.get(MemoryLogger));
    expect(injector.get(LOGGER_COPY)).not.toBe(injector.get(MemoryLogger));
    expect(injector.get(LOGGER_COPY)).toBeInstanceOf(MemoryLogger);
  });

  it('multi: true raccoglie tutti i provider in un array', async () => {
    const fixture = TestBed.createComponent(PasswordChecker);
    await fixture.whenStable();
    expect(fixture.debugElement.injector.get(PASSWORD_RULES).map((rule) => rule.label)).toEqual([
      'Almeno 8 caratteri',
      'Almeno una cifra',
      'Almeno una maiuscola',
    ]);
  });

  it('modificatori: optional, self, skipSelf, host', async () => {
    const fixture = TestBed.createComponent(ScopeHost);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    // ordine delle righe: default, self, skipSelf, host
    expect(cells(root.querySelector('#same')!, 'td')).toEqual([
      'esterno › interno',
      'esterno › interno',
      'esterno',
      'esterno › interno',
    ]);
    expect(cells(root.querySelector('sbu-di-scope-boundary')!, 'td')).toEqual(['esterno', 'null', 'esterno', 'null']);
    expect(cells(root.querySelector('#outside')!, 'td')).toEqual(['null', 'null', 'null', 'null']);
  });

  it('viewProviders non sono visibili al contenuto proiettato', async () => {
    const fixture = TestBed.createComponent(PanelHost);
    await fixture.whenStable();
    const readers = fixture.nativeElement.querySelectorAll('sbu-di-token-reader');
    const [inView, projected] = Array.from(readers as NodeListOf<Element>);
    expect(projected.id).toBe('projected');
    expect(cells(inView, 'dd')).toEqual(['dal pannello', 'dal pannello']);
    expect(cells(projected, 'dd')).toEqual(['dal pannello', 'null']);
  });

  it('createEnvironmentInjector: initializer, istanza separata, destroy', () => {
    const log = TestBed.inject(DiLog);
    const child = createEnvironmentInjector(
      [CounterStore, provideLabFeature()],
      TestBed.inject(EnvironmentInjector),
    );
    expect(log.entries().some((entry) => entry.startsWith('initializer:'))).toBe(true);

    const store = child.get(CounterStore);
    expect(store).not.toBe(TestBed.inject(CounterStore));

    child.destroy();
    expect(log.entries()).toContain(`${store.id} distrutto`);
  });

  it('token del node injector e HostAttributeToken', async () => {
    const fixture = TestBed.createComponent(NodeTokensHost);
    await fixture.whenStable();
    expect(cells(fixture.nativeElement, 'dd')).toEqual(['compatto', 'sbu-di-node-tokens', 'true', 'null']);
  });

  describe('override nei test', () => {
    it('providers del modulo di test: vincono sulla factory root, non sui providers di un componente', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: PAGE_SIZE, useValue: 5 }] });
      const fixture = TestBed.createComponent(TokenDemo);
      await fixture.whenStable();
      const text: string = fixture.nativeElement.textContent;
      expect(cells(fixture.nativeElement, 'dd')[1]).toBe('5');
      expect(text).toContain('nel figlio con providers: 50');
    });

    it('overrideProvider sostituisce anche un provider dichiarato nel componente', async () => {
      TestBed.configureTestingModule({ imports: [RecipesDemo] });
      TestBed.overrideProvider(APP_CONFIG, { useValue: { appName: 'Test', retries: 0 } });
      const fixture = TestBed.createComponent(RecipesDemo);
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('Benvenuto in Test (0 tentativi)');
    });

    it('overrideComponent cambia i providers di un solo componente', async () => {
      TestBed.overrideComponent(RecipesDemo, {
        set: {
          providers: [
            { provide: Logger, useClass: MemoryLogger },
            { provide: APP_CONFIG, useValue: { appName: 'Mock', retries: 1 } },
            { provide: GREETING, useValue: 'ciao' }, // `set` rimpiazza TUTTO l'array
          ],
        },
      });
      const fixture = TestBed.createComponent(RecipesDemo);
      expect(fixture.debugElement.injector.get(Logger)).toBeInstanceOf(MemoryLogger);
    });
  });
});
