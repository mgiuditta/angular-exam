import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { AliasDemo } from './alias-demo';
import { LocalCounterCard, SharedCounterCard } from './counter-card';
import { DiLogView } from './di-log-view';
import { EnvironmentDemo } from './environment-demo';
import { InjectionContextDemo } from './injection-context-demo';
import { NodeTokens } from './node-tokens';
import { PasswordChecker } from './password-checker';
import { RecipesDemo } from './recipes-demo';
import { ScopeDirective } from './scope';
import { ScopeBoundary } from './scope-boundary';
import { ScopeProbe } from './scope-probe';
import { TokenDemo } from './token-demo';
import { TokenReader } from './token-reader';
import { ViewProvidersPanel } from './view-providers-panel';

const CODE = {
  providedIn: ts`
    @Injectable({ providedIn: 'root' })        // singleton dell'app, tree-shakable
    export class CounterStore {
      readonly id = nextInstanceId('CounterStore');
      constructor() {
        const log = inject(DiLog);
        inject(DestroyRef).onDestroy(() => log.add(\`\${this.id} distrutto\`));
      }
    }

    // nessun provider: risale fino a root → istanza condivisa
    @Component({ selector: 'sbu-di-shared-counter-card', /* … */ })
    export class SharedCounterCard { store = inject(CounterStore); }

    // providers: nuova istanza per OGNI card, distrutta con la card
    @Component({ selector: 'sbu-di-local-counter-card', providers: [CounterStore], /* … */ })
    export class LocalCounterCard { store = inject(CounterStore); }

    @Injectable({ providedIn: 'platform' })    // condiviso da più app bootstrap-ate nella stessa pagina
    @Injectable({ providedIn: 'any' })         // DEPRECATO: un'istanza per injector lazy
    @Injectable()                              // nessuno scope: va messo in un array providers
  `,
  injectionContext: ts`
    export function injectDiLog(): DiLog {
      assertInInjectionContext(injectDiLog);   // NG0203 con il nome della funzione
      return inject(DiLog);
    }

    // ✔ injection context
    private readonly injector = inject(Injector);                        // field initializer
    constructor() { this.log = injectDiLog(); }                          // constructor
    { provide: GREETING, useFactory: () => inject(APP_CONFIG).appName }  // factory
    export const authGuard: CanActivateFn = () => inject(Auth).isLoggedIn(); // guard funzionale

    // ✘ fuori contesto → NG0203
    onClick() { injectDiLog(); }
    async load() { await something(); inject(DiLog); }
    ngOnInit() { inject(DiLog); }

    // ✔ rientrare nel contesto con un injector salvato prima
    runInInjectionContext(this.injector, () => injectDiLog());

    // stile classico equivalente: constructor injection (+ @Inject per i token)
    constructor(private readonly log: DiLog, @Inject(APP_CONFIG) config: AppConfig) {}
  `,
  recipes: ts`
    export abstract class Logger { /* id, lines, log() */ }   // classe astratta = token + tipo
    export interface AppConfig { appName: string; retries: number }
    export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG'); // interface → serve un token

    @Component({
      providers: [
        { provide: Logger, useClass: ShoutLogger },
        { provide: APP_CONFIG, useValue: { appName: 'Eserciziario', retries: 3 } },
        {
          provide: GREETING,
          useFactory: () => {
            const config = inject(APP_CONFIG);
            return \`Benvenuto in \${config.appName} (\${config.retries} tentativi)\`;
          },
          // forma legacy: useFactory: (config: AppConfig) => …, deps: [APP_CONFIG]
        },
      ],
    })
    export class RecipesDemo {
      logger = inject(Logger);        // ShoutLogger
      config = inject(APP_CONFIG);
      greeting = inject(GREETING);
    }
  `,
  alias: ts`
    providers: [
      MemoryLogger,                                        // istanza A
      { provide: Logger, useExisting: MemoryLogger },      // alias → istanza A
      { provide: LOGGER_COPY, useClass: MemoryLogger },    // istanza B
    ]

    inject(Logger) === inject(MemoryLogger);       // true
    inject(LOGGER_COPY) === inject(MemoryLogger);  // false
  `,
  multi: ts`
    export const PASSWORD_RULES = new InjectionToken<readonly PasswordRule[]>('PASSWORD_RULES');

    export function providePasswordRule(label: string, test: (value: string) => boolean): Provider {
      return { provide: PASSWORD_RULES, useValue: { label, test }, multi: true };
    }

    @Component({
      providers: [
        providePasswordRule('Almeno 8 caratteri', (value) => value.length >= 8),
        providePasswordRule('Almeno una cifra', (value) => /\\d/.test(value)),
        providePasswordRule('Almeno una maiuscola', (value) => /[A-Z]/.test(value)),
      ],
    })
    export class PasswordChecker {
      rules = inject(PASSWORD_RULES);   // array di 3 regole
      checks = computed(() => this.rules.map((rule) => ({ label: rule.label, ok: rule.test(this.value()) })));
    }
  `,
  tokens: ts`
    // senza factory: qualcuno DEVE fornirlo
    export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
    inject(API_BASE_URL);                       // NullInjectorError (NG0201)
    inject(API_BASE_URL, { optional: true });   // null

    // con factory: default in root, tree-shakable
    export const PAGE_SIZE = new InjectionToken<number>('PAGE_SIZE', {
      providedIn: 'root',                       // già il default quando c'è factory
      factory: () => 20,
    });
    export const DOCUMENT_LANG = new InjectionToken<string>('DOCUMENT_LANG', {
      factory: () => inject(DOCUMENT).documentElement.lang || 'non impostata',
    });

    // override locale
    @Component({ providers: [{ provide: PAGE_SIZE, useValue: 50 }] })
  `,
  viewProviders: ts`
    @Component({
      selector: 'sbu-di-view-providers-panel',
      providers: [{ provide: FROM_PROVIDERS, useValue: 'dal pannello' }],
      viewProviders: [{ provide: FROM_VIEW_PROVIDERS, useValue: 'dal pannello' }],
      template: \`
        <sbu-di-token-reader label="Nel template del pannello (view)" />  <!-- vede entrambi -->
        <ng-content />
      \`,
    })

    <!-- template della pagina -->
    <sbu-di-view-providers-panel>
      <sbu-di-token-reader label="Proiettato" />   <!-- viewProviders → null -->
    </sbu-di-view-providers-panel>
  `,
  modifiers: ts`
    @Directive({
      selector: '[sbuDiScope]',
      providers: [{ provide: Scope, useExisting: forwardRef(() => ScopeDirective) }],
    })
    export class ScopeDirective implements Scope {
      name = input.required<string>({ alias: 'sbuDiScope' });
      private parent = inject(Scope, { skipSelf: true, optional: true });   // lo scope sopra di me
      path = computed(() => this.parent ? \`\${this.parent.path()} › \${this.name()}\` : this.name());
    }

    // nella probe
    inject(Scope, { optional: true });                   // il più vicino
    inject(Scope, { self: true, optional: true });       // solo il mio elemento
    inject(Scope, { skipSelf: true, optional: true });   // dal genitore in su
    inject(Scope, { host: true, optional: true });       // non oltre l'host della view che mi dichiara

    <div sbuDiScope="esterno">
      <sbu-di-scope-probe sbuDiScope="interno" />       <!-- direttiva sullo stesso elemento -->
      <sbu-di-scope-boundary />                         <!-- probe nel template del figlio -->
    </div>
  `,
  environment: ts`
    // node injector → Injector leggero figlio
    const injector = Injector.create({
      providers: [{ provide: LOGGER_COPY, useClass: MemoryLogger }],
      parent: inject(Injector),
    });

    // environment injector figlio: accetta EnvironmentProviders, esegue gli initializer
    const child = createEnvironmentInjector([CounterStore, provideLabFeature()], inject(EnvironmentInjector));
    child.get(CounterStore);   // nuova istanza, non quella root
    child.destroy();           // DestroyRef.onDestroy dei servizi creati da child

    export function provideLabFeature(): EnvironmentProviders {
      return makeEnvironmentProviders([
        FeatureService,
        provideEnvironmentInitializer(() => inject(DiLog).add('pronto')),
      ]);
    }

    // app.config.ts
    providers: [
      provideLabFeature(),
      provideAppInitializer(() => inject(ConfigLoader).load()),   // Promise/Observable: il bootstrap aspetta
    ]

    // route: environment injector creato alla prima attivazione della route
    { path: 'admin', providers: [AdminStore, provideLabFeature()], loadComponent: () => import('./admin') }
  `,
  nodeTokens: ts`
    <sbu-di-node-tokens variant="compatto" />

    export class NodeTokens {
      variant = inject(new HostAttributeToken('variant'), { optional: true });  // 'compatto'
      host = inject<ElementRef<HTMLElement>>(ElementRef);
      anchoredOnHost = inject(ViewContainerRef).element.nativeElement === this.host.nativeElement;
      fromEnvironment = inject(EnvironmentInjector).get(ElementRef, null);     // null
      private cdr = inject(ChangeDetectorRef);

      updateLater(markForCheck: boolean) {
        setTimeout(() => {
          this.plainUpdates++;                   // campo normale: zoneless non se ne accorge
          if (markForCheck) this.cdr.markForCheck();
        }, 300);
      }
    }
  `,
  testing: ts`
    TestBed.configureTestingModule({
      imports: [RecipesDemo],                            // necessario perché overrideProvider lo "veda"
      providers: [{ provide: PAGE_SIZE, useValue: 5 }],   // root injector del test
    });

    // sostituisce il provider ovunque sia dichiarato, anche nei providers dei componenti importati
    TestBed.overrideProvider(APP_CONFIG, { useValue: { appName: 'Test', retries: 0 } });

    // oppure: riscrive i providers di UN componente (set = rimpiazza tutto l'array)
    TestBed.overrideComponent(RecipesDemo, {
      set: { providers: [{ provide: Logger, useClass: MemoryLogger }, /* APP_CONFIG, GREETING… */] },
    });

    const fixture = TestBed.createComponent(RecipesDemo);
    TestBed.inject(DiLog);                           // dal root injector
    fixture.debugElement.injector.get(Logger);       // dal node injector del componente
    TestBed.runInInjectionContext(() => injectDiLog());  // testare funzioni injectXxx / guard
  `,
};

/**
 * Pagina: DEPENDENCY INJECTION
 *
 * Checklist certificazione:
 * - `@Injectable({ providedIn: 'root' })` = singleton tree-shakable. `providers` di componente/direttiva =
 *   un'istanza per istanza del componente, distrutta con lui. 'platform' raro, 'any' deprecato.
 * - `inject()` solo in injection context (field initializer, constructor, factory, guard/resolver/interceptor
 *   funzionali, runInInjectionContext). Altrimenti NG0203.
 * - Ricette: useClass (istanzia), useValue (valore pronto), useFactory (funzione, può usare inject()),
 *   useExisting (ALIAS: stessa istanza), multi: true (array).
 * - Token: classe (anche astratta) o InjectionToken<T>. Un'interface NON esiste a runtime.
 * - Due gerarchie: node injector (elementi) → poi environment injector (route → root → platform → null).
 * - viewProviders: invisibili al contenuto proiettato. Modificatori: optional, self, skipSelf, host.
 * - EnvironmentProviders (makeEnvironmentProviders) non vanno nei providers dei componenti.
 * - ElementRef/ViewContainerRef/ChangeDetectorRef/TemplateRef/HostAttributeToken: solo node injector.
 * - Test: providers in configureTestingModule, TestBed.overrideProvider/overrideComponent, TestBed.inject.
 */
@Component({
  selector: 'sbu-di-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Example,
    LabPage,
    CodeBlock,
    SharedCounterCard,
    LocalCounterCard,
    DiLogView,
    InjectionContextDemo,
    RecipesDemo,
    AliasDemo,
    PasswordChecker,
    TokenDemo,
    ViewProvidersPanel,
    TokenReader,
    ScopeDirective,
    ScopeProbe,
    ScopeBoundary,
    EnvironmentDemo,
    NodeTokens,
  ],
  template: `
    <sbu-lab-page heading="Dependency injection">
      <span intro>
        Chi crea le istanze, quante ne crea e dove le cerca: provider, token, injector gerarchici e modificatori.
      </span>

      <sbu-example [n]="1" title="providedIn: 'root' vs providers del componente">
        <div class="grid gap-3 sm:grid-cols-2">
          <sbu-di-shared-counter-card label="Card condivisa A" />
          <sbu-di-shared-counter-card label="Card condivisa B" />
          @if (showLocalCards()) {
            <sbu-di-local-counter-card label="Card locale C" />
            <sbu-di-local-counter-card label="Card locale D" />
          }
        </div>
        <button type="button" class="btn mt-3" (click)="toggleLocalCards()">
          {{ showLocalCards() ? 'Distruggi' : 'Crea' }} le card locali
        </button>
        <sbu-di-log-view />
        <sbu-code [code]="code.providedIn" />
        <p note>
          A e B mostrano lo stesso id e lo stesso contatore: un'unica istanza root. C e D hanno ciascuna la propria, che
          muore con la card (vedi log): <code>inject(DestroyRef)</code> in un servizio è il DestroyRef dell'injector che
          l'ha creato. L'istanza root non viene mai distrutta finché vive l'app.
        </p>
        <p note>
          <code>providedIn: 'root'</code> è tree-shakable: se nessuno inietta la classe, non finisce nel bundle.
          <code>providers: [X]</code> in <code>app.config.ts</code> invece la include sempre. Se una classe è
          <code>providedIn: 'root'</code> ma è anche nei <code>providers</code> di un componente, vince il provider più
          vicino a chi inietta.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="inject() e injection context" level="intermedio">
        <sbu-di-injection-context-demo />
        <sbu-code [code]="code.injectionContext" />
        <p note>
          NG0203: <code>inject()</code> chiamato fuori da un injection context. Il contesto esiste solo in modo
          SINCRONO durante la creazione: non in event handler, <code>setTimeout</code>, <code>ngOnInit</code> o dopo un
          <code>await</code>. Salva <code>inject(Injector)</code> in un campo e usa
          <code>runInInjectionContext</code> quando serve dopo.
        </p>
        <p note>
          <code>inject()</code> vs constructor injection: stesso risultato, ma <code>inject()</code> funziona in
          funzioni (guard, interceptor, <code>injectXxx()</code> riusabili), non richiede di ripassare le dipendenze
          alle sottoclassi con <code>super(…)</code> ed è tipizzato anche per gli InjectionToken senza
          <code>&#64;Inject</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="Ricette: useClass, useValue, useFactory">
        <sbu-di-recipes-demo />
        <sbu-code [code]="code.recipes" />
        <p note>
          Chi inietta <code>Logger</code> non sa che riceve <code>ShoutLogger</code>: si cambia implementazione solo nel
          provider. <code>Logger</code> è una classe ASTRATTA: esiste a runtime, quindi fa da token. Un'interface viene
          cancellata da TypeScript: per <code>AppConfig</code> serve un <code>InjectionToken&lt;AppConfig&gt;</code>.
        </p>
        <p note>
          <code>useFactory</code> viene chiamata una sola volta per injector (poi cache) e gira in injection context.
          <code>useValue</code> con un oggetto: tutti ricevono lo STESSO riferimento, mutarlo lo cambia per tutti.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="useExisting (alias) vs useClass (seconda istanza)" level="intermedio">
        <sbu-di-alias-demo />
        <sbu-code [code]="code.alias" />
        <p note>
          Il log via <code>Logger</code> incrementa anche la riga di <code>MemoryLogger</code>: è un alias. Con
          <code>useClass</code> nasce un'istanza separata anche se la classe è la stessa. Domanda tipica: "due token,
          una sola istanza" → <code>useExisting</code>; <code>useClass</code> creerebbe due stati diversi.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="multi: true" level="intermedio">
        <sbu-di-password-checker />
        <sbu-code [code]="code.multi" />
        <p note>
          Ogni provider <code>multi: true</code> aggiunge un elemento: <code>inject</code> restituisce un array. Mescolare
          provider multi e normali sullo stesso token è un errore negli environment injector ("Cannot mix multi providers
          and regular providers", solo in dev mode). Un multi provider in un injector figlio NON si somma a quelli del padre: li oscura. Stesso meccanismo di
          <code>NG_VALIDATORS</code>, <code>HTTP_INTERCEPTORS</code> e degli initializer.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="InjectionToken con e senza factory" level="intermedio">
        <sbu-di-token-demo />
        <sbu-code [code]="code.tokens" />
        <p note>
          Il token è l'ISTANZA: due <code>new InjectionToken('X')</code> con la stessa descrizione sono token diversi.
          Con <code>factory</code> il token ha un default in root (tree-shakable) e la factory può usare
          <code>inject()</code>; senza, <code>inject</code> lancia NullInjectorError se nessuno lo fornisce, a meno di
          <code>{{ '{' }} optional: true {{ '}' }}</code> (→ <code>null</code>, tipo <code>T | null</code>).
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="providers vs viewProviders e contenuto proiettato" level="avanzato">
        <sbu-di-view-providers-panel>
          <sbu-di-token-reader label="Proiettato con ng-content" />
        </sbu-di-view-providers-panel>
        <sbu-code [code]="code.viewProviders" />
        <p note>
          Il lettore proiettato è scritto nel template della PAGINA: risalendo gli injector passa dal nodo del pannello,
          ma lì vede solo i <code>providers</code>. Il lettore nel template del pannello vede entrambi. Stessa logica per
          le query: il contenuto proiettato appartiene alla view di chi lo scrive.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="Provider di direttiva e modificatori: optional, self, skipSelf, host" level="avanzato">
        <div class="grid gap-4 md:grid-cols-3">
          <div sbuDiScope="esterno" class="contents">
            <sbu-di-scope-probe sbuDiScope="interno" label="Probe con sbuDiScope='interno' sullo stesso elemento" />
            <sbu-di-scope-boundary />
          </div>
          <sbu-di-scope-probe label="Probe fuori da ogni scope" />
        </div>
        <sbu-code [code]="code.modifiers" />
        <p note>
          La direttiva fornisce <code>Scope</code> sul proprio elemento: <code>self</code> lo trova solo se la direttiva
          è sullo stesso elemento della probe, <code>skipSelf</code> salta al genitore ("esterno"). Nella probe dentro
          <code>sbu-di-scope-boundary</code> il default trova "esterno", ma <code>host</code> si ferma al confine del
          componente figlio → <code>null</code>.
        </p>
        <p note>
          Senza <code>optional</code>, un token non trovato lancia NullInjectorError (NG0201). La direttiva usa
          <code>skipSelf</code> su se stessa per costruire il percorso "esterno › interno": è il pattern di form group,
          menu e accordion annidati. <code>forwardRef</code> serve quando si referenzia una classe non ancora
          definita (dichiarata più sotto nello stesso file).
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="Environment injector: Injector.create, createEnvironmentInjector, provideXxx()" level="avanzato">
        <sbu-di-environment-demo />
        <sbu-code [code]="code.environment" />
        <p note>
          Ordine di risoluzione: node injector dell'elemento → antenati nel DOM logico → environment injector (route →
          root) → platform → NullInjector. <code>createEnvironmentInjector</code> esegue subito
          <code>provideEnvironmentInitializer</code> e restituisce un <code>CounterStore</code> diverso da quello root:
          un provider nel figlio oscura il padre. Chi crea l'injector deve chiamare <code>destroy()</code>.
        </p>
        <p note>
          Route <code>providers</code>: environment injector creato alla prima attivazione; NON viene distrutto uscendo
          dalla route (salvo <code>withExperimentalAutoCleanupInjectors()</code>). Un servizio
          <code>providedIn: 'root'</code> iniettato in un componente lazy resta comunque il singleton root.
          <code>provideAppInitializer</code> sostituisce il deprecato <code>APP_INITIALIZER</code>,
          <code>provideEnvironmentInitializer</code> sostituisce <code>ENVIRONMENT_INITIALIZER</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="Token del node injector: ElementRef, ViewContainerRef, ChangeDetectorRef, HostAttributeToken" level="intermedio">
        <sbu-di-node-tokens variant="compatto" />
        <sbu-code [code]="code.nodeTokens" />
        <p note>
          Questi token descrivono il nodo corrente: in un servizio <code>providedIn: 'root'</code> non esistono
          (NullInjectorError), passali come argomento o usa un servizio fornito nel componente.
          <code>HostAttributeToken</code> legge solo attributi statici, una volta: per valori che cambiano usa un input.
        </p>
        <p note>
          App zoneless: il primo bottone aggiorna il campo ma non lo schermo (il numero compare solo al prossimo evento
          dentro questo componente, che avvia il CD). Il secondo chiama <code>markForCheck()</code> e si vede subito. Con un signal non servirebbe.
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="Test: providers e overrideProvider" level="intermedio">
        <sbu-code [code]="code.testing" />
        <p note>
          <code>providers</code> di <code>configureTestingModule</code> vanno nel root injector del test: NON sostituiscono
          quelli dichiarati nei <code>providers</code> di un componente (vince il più vicino). Per quelli servono
          <code>TestBed.overrideProvider</code> (per token; il componente deve essere negli <code>imports</code> del
          modulo di test, altrimenti l'override viene ignorato in silenzio) o <code>overrideComponent</code>. Gli
          override vanno fatti prima di <code>createComponent</code>. Esempi eseguiti in <code>di.spec.ts</code>.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class DiPage {
  protected readonly code = CODE;
  protected readonly showLocalCards = signal(true);

  protected toggleLocalCards(): void {
    this.showLocalCards.update((shown) => !shown);
  }
}
