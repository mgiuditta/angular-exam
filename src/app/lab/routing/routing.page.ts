import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  TitleStrategy,
  isActive,
} from '@angular/router';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { DemoSession } from './demo-session';
import { injectNavigationLog } from './navigation-log';
import { ProductApi } from './product-api';

const CODE = {
  config: ts`
    export default [
      {
        path: '',
        component: RoutingPage,
        title: 'Routing',                                   // title statico
        children: [
          { path: '', pathMatch: 'full', component: DemoHome },
          { path: 'legacy/:id', redirectTo: 'products/:id' }, // stringa, relativa, con :id
          { path: 'start', redirectTo: () =>                  // funzione (v18+)
              inject(DemoSession).loggedIn() ? 'admin' : 'login' },
          {
            path: 'products/:id',
            component: ProductDetail,
            title: productTitleResolver,                      // ResolveFn<string>
            data: { section: 'Catalogo' },                    // dati statici
          },
          { path: '**', component: NotFound, title: 'Pagina non trovata' }, // SEMPRE ultima
        ],
      },
    ] satisfies Routes;

    export const productTitleResolver: ResolveFn<string> = (route) =>
      \`Prodotto #\${route.paramMap.get('id')}\`;
  `,
  lazy: ts`
    // app.routes.ts: la pagina intera è un sotto-albero lazy
    { path: 'routing', loadChildren: () => import('./lab/routing/routing.routes') },

    // routing.routes.ts
    {
      path: '',
      component: RoutingPage,
      providers: [DemoSession],                              // EnvironmentInjector della rotta
      children: [
        { path: 'admin', loadComponent: () => import('./admin-panel') },       // default export
        { path: 'settings', loadChildren: () => import('./settings.routes') }, // default export
        // senza default export:
        // loadComponent: () => import('./admin-panel').then((m) => m.AdminPanel)
      ],
    }

    @Injectable()                                            // niente providedIn: 'root'
    export class DemoSession { readonly loggedIn = signal(false); }
  `,
  routerLink: ts`
    <a [routerLink]="['products', 1]">array di comandi</a>
    <a routerLink="products/2" [queryParams]="{ tab: 'specs' }">stringa + queryParams</a>
    <a routerLink="products/2" [queryParams]="{ ref: 'lab' }" queryParamsHandling="merge">merge</a>
    <a routerLink="products/3" queryParamsHandling="preserve">preserve</a>
    <a routerLink="products/1" fragment="recensioni">fragment</a>
    <a routerLink="compare/1" [state]="{ from: 'esempio 3' }">state</a>

    <!-- dentro ProductDetail (rotta products/:id) -->
    <a [routerLink]="['..', id() + 1]" queryParamsHandling="preserve">prodotto successivo</a>

    // lettura dello state dopo la navigazione
    router.lastSuccessfulNavigation()?.extras.state
  `,
  routerLinkActive: ts`
    <a
      routerLink="."
      routerLinkActive="bg-secondary"
      ariaCurrentWhenActive="page"
      [routerLinkActiveOptions]="{ exact: true }"
    >Home demo</a>

    @for (id of productIds; track id) {
      <a [routerLink]="['products', id]" routerLinkActive="bg-secondary" ariaCurrentWhenActive="page">…</a>
    }

    // v21.1: stato "attivo" come signal, anche fuori dal template
    productsActive = isActive(
      this.router.createUrlTree(['products'], { relativeTo: this.route }),
      this.router,
    );
  `,
  inputBinding: ts`
    // app.config.ts
    provideRouter(routes, withComponentInputBinding())

    // rotta: path 'products/:id', data: { section }, resolve: { product }
    export class ProductDetail {
      readonly id = input.required({ transform: numberAttribute }); // path param (stringa → number)
      readonly tab = input<string>();                               // query param ?tab=
      readonly section = input<string>();                           // data
      readonly product = input.required<Product>();                 // resolve
    }
  `,
  activatedRoute: ts`
    export class CompareParams {
      private readonly route = inject(ActivatedRoute);

      // ❌ letto una volta: se il componente è riusato resta vecchio
      snapshotId = this.route.snapshot.paramMap.get('id');

      // ✅ Observable → signal: si aggiorna a ogni cambio di parametri
      liveId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
        requireSync: true,
      });
    }
    // altri stream: queryParamMap, data, fragment, url · snapshot.queryParamMap, snapshot.data…
  `,
  programmatic: ts`
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    // comandi, relativi SOLO con relativeTo (altrimenti partono dalla root)
    this.router.navigate(['products', 2], { relativeTo: this.route, queryParams: { tab: 'specs' } });

    // URL assoluto già pronto (stringa o UrlTree): nessun relativeTo
    this.router.navigateByUrl('/routing/compare/3', { replaceUrl: true });

    // UrlTree: costruito senza navigare, serializzabile, restituibile da guard
    const tree = this.router.createUrlTree(['products', 3], {
      relativeTo: this.route,
      queryParams: { tab: 'specs' },
      fragment: 'dettagli',
    });
    this.router.serializeUrl(tree);   // "/routing/products/3?tab=specs#dettagli"
    this.router.navigateByUrl(tree);  // Promise<boolean>
  `,
  guards: ts`
    function loginUrlTree(returnUrl: string): UrlTree {
      return inject(Router).createUrlTree(['/routing/login'], { queryParams: { returnUrl } });
    }

    export const authGuard: CanActivateFn = (_route, state) =>
      inject(DemoSession).loggedIn() || loginUrlTree(state.url);          // UrlTree = redirect

    export const authChildGuard: CanActivateChildFn = (_childRoute, state) =>
      inject(DemoSession).loggedIn() ||
      new RedirectCommand(loginUrlTree(state.url), { replaceUrl: true }); // redirect + opzioni

    // rotte
    { path: 'admin', canActivate: [authGuard], loadComponent: () => import('./admin-panel') },
    { path: '', component: SettingsShell, canActivateChild: [authChildGuard], children: [...] }
  `,
  canDeactivate: ts`
    export interface ConfirmLeave {
      confirmLeave(targetUrl: string): boolean | Promise<boolean>;
    }

    export const unsavedChangesGuard: CanDeactivateFn<ConfirmLeave> = (
      component, _currentRoute, _currentState, nextState,
    ) => component.confirmLeave(nextState.url);

    // DraftEditor implements ConfirmLeave
    confirmLeave(targetUrl: string): boolean | Promise<boolean> {
      if (!this.form.dirty) return true;
      this.pendingTarget.set(targetUrl);                         // mostra la conferma in pagina
      return new Promise((resolve) => (this.resolveLeave = resolve));
    }

    { path: 'editor', component: DraftEditor, canDeactivate: [unsavedChangesGuard] }
  `,
  canMatch: ts`
    export const betaGuard: CanMatchFn = () => inject(DemoSession).beta();

    { path: 'dashboard', canMatch: [betaGuard], loadComponent: () => import('./dashboard-beta') },
    { path: 'dashboard', component: DashboardClassic },     // fallback: stesso path, dopo

    // stesso URL: di default la navigazione è ignorata (NavigationSkipped)
    this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  `,
  resolver: ts`
    export const productResolver: ResolveFn<Product> = async (route, state) => {
      const api = inject(ProductApi);                           // PRIMA di ogni await
      const product = await api.fetch(Number(route.paramMap.get('id')));
      if (product) return product;
      // '..' = un SEGMENTO: ['..', 'not-found'] darebbe products/not-found → loop infinito
      return new RedirectCommand(createUrlTreeFromSnapshot(route, ['../..', 'not-found']), {
        browserUrl: state.url,                                  // la barra mostra l'URL richiesto
      });
    };

    {
      path: 'products/:id',
      resolve: { product: productResolver },                    // → input product
      runGuardsAndResolvers: 'pathParamsChange',
    }
  `,
  events: ts`
    export function injectNavigationLog(limit = 8): Signal<readonly string[]> {
      const events = inject(Router).events.pipe(
        filter(isNavigationLifecycle),         // NavigationStart | End | Cancel | Skipped | Error
        map(describeEvent),
        scan((log: readonly string[], line: string) => [...log, line].slice(-limit), []),
      );
      return toSignal(events, { initialValue: [] });
    }

    // v20.2+: signal al posto di getCurrentNavigation() (deprecato)
    isNavigating = computed(() => this.router.currentNavigation() !== null);

    // la Promise di navigate/navigateByUrl RIGETTA su NavigationError
    try {
      await this.router.navigate(['broken'], { relativeTo: this.route });
    } catch (error) { … }
  `,
  appConfig: ts`
    export const appConfig: ApplicationConfig = {
      providers: [
        provideRouter(
          routes,
          withComponentInputBinding(),                    // params/query/data/resolve → input()
          withViewTransitions(),                          // document.startViewTransition tra le rotte
          withRouterConfig({ paramsInheritanceStrategy: 'always' }), // i figli ereditano params/data
          withPreloading(PreloadAllModules),              // scarica i chunk lazy dopo il bootstrap
          withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
          withNavigationErrorHandler((error) => inject(ErrorLogger).log(error.error)),
        ),
        { provide: TitleStrategy, useClass: LabTitleStrategy },
      ],
    };

    @Injectable({ providedIn: 'root' })
    export class LabTitleStrategy extends TitleStrategy {
      private readonly title = inject(Title);

      override updateTitle(snapshot: RouterStateSnapshot): void {
        const title = this.buildTitle(snapshot);        // title della rotta più profonda che lo definisce
        this.title.setTitle(title ? \`\${title} · Angular Lab\` : 'Angular Lab');
      }
    }
  `,
};

/**
 * Pagina: ROUTING
 *
 * Checklist certificazione:
 * - Route config: l'ordine conta (vince la prima), `**` per ultima, `pathMatch: 'full'` su `''` con redirect.
 * - `redirectTo` stringa (relativa se senza '/') o funzione (v18+, injection context).
 * - Lazy: `loadComponent` (un componente) vs `loadChildren` (un array di Routes); `export default` evita `.then`.
 * - `providers` su una rotta → EnvironmentInjector dedicato, visibile a tutti i discendenti.
 * - Lettura parametri: `withComponentInputBinding` + `input()` oppure `ActivatedRoute` (Observable!).
 *   Il componente viene RIUSATO se cambiano solo i parametri: lo snapshot diventa vecchio.
 * - `navigate(comandi, { relativeTo })` vs `navigateByUrl(url assoluto | UrlTree)`.
 * - Guard funzionali con `inject()`: canActivate, canActivateChild, canDeactivate, canMatch.
 *   Risultato: boolean | UrlTree | RedirectCommand (anche in Promise/Observable).
 * - ResolveFn blocca la navigazione; `runGuardsAndResolvers` decide quando rieseguirlo.
 * - Eventi: NavigationStart → (Cancel | Error | Skipped) | End; `currentNavigation()` è un signal.
 */
@Component({
  selector: 'sbu-routing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Example, LabPage, CodeBlock, RouterLink, RouterLinkActive, RouterOutlet, JsonPipe],
  template: `
    <sbu-lab-page heading="Routing">
      <span intro>
        Configurazione, lazy loading, link, parametri, guard, resolver ed eventi. Ogni link naviga davvero: il
        risultato compare nell'area demo in fondo, che resta visibile mentre scorri.
      </span>

      <sbu-example [n]="1" title="Route config: pathMatch, redirectTo, **, title, data">
        <nav aria-label="Demo configurazione" class="flex flex-wrap gap-2">
          <a class="btn" routerLink=".">'' (pathMatch full)</a>
          <a class="btn" routerLink="legacy/2">legacy/2 → redirect stringa</a>
          <a class="btn" routerLink="start">start → redirect funzione</a>
          <a class="btn" routerLink="products/1">products/1 (title resolver)</a>
          <a class="btn" routerLink="non-esiste">non-esiste → **</a>
        </nav>
        <sbu-code [code]="code.config" />
        <p note>
          Il router prova le route NELL'ORDINE dichiarato: <code>**</code> prima delle altre le oscura tutte. Con
          <code>redirectTo: 'x'</code> su <code>path: ''</code> serve <code>pathMatch: 'full'</code>: con
          <code>'prefix'</code> (default) il path vuoto è prefisso di ogni URL.
        </p>
        <p note>
          Dopo un redirect RELATIVO non se ne applica un secondo allo stesso livello (niente catene); uno assoluto
          (<code>/</code> iniziale) riparte dalla root. <code>redirectTo</code> non si combina con
          <code>component</code> o <code>children</code>; la versione funzione può restituire anche un
          <code>UrlTree</code>. Osserva nell'area demo URL e title: <code>start</code> porta a login o admin in base al
          login dell'esempio 8.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="Lazy loading e providers di rotta">
        <nav aria-label="Demo lazy loading" class="flex flex-wrap gap-2">
          <a class="btn" routerLink="settings">settings (loadChildren)</a>
          <a class="btn" routerLink="admin">admin (loadComponent + guard)</a>
          <a class="btn" routerLink="dashboard">dashboard (loadComponent se beta)</a>
        </nav>
        <sbu-code [code]="code.lazy" />
        <p note>
          Apri DevTools → Network: il chunk arriva al primo click e poi resta in cache. <code>loadComponent</code> carica
          un componente, <code>loadChildren</code> un array di <code>Routes</code> (anche con altri lazy dentro).
        </p>
        <p note>
          <code>providers</code> sulla rotta crea un EnvironmentInjector figlio: <code>DemoSession</code> esiste solo sotto
          /routing ed è condiviso da guard, resolver e componenti. NON viene distrutto uscendo dalla rotta (a differenza
          dei provider di componente).
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="RouterLink: comandi, relativi, query, fragment, state" level="intermedio">
        <nav aria-label="Demo RouterLink" class="flex flex-wrap gap-2">
          <a class="btn" [routerLink]="['products', 1]">['products', 1]</a>
          <a class="btn" routerLink="products/2" [queryParams]="{ tab: 'specs' }">?tab=specs</a>
          <a class="btn" routerLink="products/2" [queryParams]="{ ref: 'lab' }" queryParamsHandling="merge">
            merge ?ref=lab
          </a>
          <a class="btn" routerLink="products/3" queryParamsHandling="preserve">preserve</a>
          <a class="btn" routerLink="products/1" fragment="recensioni">#recensioni</a>
          <a class="btn" routerLink="compare/1" [state]="{ from: 'esempio 3' }">state</a>
        </nav>
        <sbu-code [code]="code.routerLink" />
        <p note>
          Senza <code>/</code> iniziale il link è relativo alla rotta del componente che lo contiene (qui la pagina):
          <code>products/1</code> diventa /routing/products/1. Nel dettaglio prodotto <code>['..', id + 1]</code> sale di
          un SEGMENTO di URL, non di una route config.
        </p>
        <p note>
          <code>queryParamsHandling</code>: default <code>replace</code> (sostituisce), <code>merge</code> (unisce),
          <code>preserve</code> (tiene quelli attuali e ignora <code>queryParams</code>). <code>state</code> non finisce
          nell'URL: sopravvive nello history state (e al reload), ma non a un link condiviso.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="RouterLinkActive, ariaCurrentWhenActive, isActive()" level="intermedio">
        <nav aria-label="Demo link attivi">
          <ul class="flex flex-wrap gap-2">
            <li>
              <a
                class="btn"
                routerLink="."
                routerLinkActive="bg-secondary"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                Home demo (exact)
              </a>
            </li>
            @for (id of productIds; track id) {
              <li>
                <a class="btn" [routerLink]="['products', id]" routerLinkActive="bg-secondary" ariaCurrentWhenActive="page">
                  Prodotto {{ id }}
                </a>
              </li>
            }
          </ul>
        </nav>
        <p class="mt-3 text-sm">
          isActive(products): <strong>{{ productsActive() }}</strong>
        </p>
        <sbu-code [code]="code.routerLinkActive" />
        <p note>
          Senza <code>exact: true</code> il link a /routing sarebbe sempre attivo: di default basta che l'URL corrente
          CONTENGA quello del link. <code>ariaCurrentWhenActive="page"</code> aggiunge <code>aria-current</code> per gli
          screen reader: il colore da solo non basta (WCAG 1.4.1).
        </p>
        <p note>
          Per opzioni più fini: <code>{{ '{' }} paths, queryParams, matrixParams, fragment {{ '}' }}</code>
          (<code>IsActiveMatchOptions</code>). <code>#rla="routerLinkActive"</code> espone <code>rla.isActive</code> nel
          template; la funzione <code>isActive()</code> (v21.1) restituisce un signal.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="Parametri come input(): withComponentInputBinding" level="intermedio">
        <nav aria-label="Demo input binding" class="flex flex-wrap gap-2">
          <a class="btn" routerLink="products/1">products/1</a>
          <a class="btn" routerLink="products/2" [queryParams]="{ tab: 'reviews' }">products/2?tab=reviews</a>
        </nav>
        <sbu-code [code]="code.inputBinding" />
        <p note>
          Il router scrive negli input con lo stesso nome di query param, path param, <code>data</code> e chiavi di
          <code>resolve</code>; a parità di nome vince l'ultimo di questa lista (data/resolve sovrascrivono i params). Dall'URL arrivano SEMPRE stringhe:
          <code>numberAttribute</code> / <code>booleanAttribute</code> convertono.
        </p>
        <p note>
          Usa ◀ ▶ nel dettaglio: l'istanza resta la stessa, cambiano solo gli input. Togliendo <code>?tab</code> l'input
          torna a <code>undefined</code>. Funziona solo per il componente ROUTED, non per i suoi figli di template; i
          params dei padri arrivano solo con <code>paramsInheritanceStrategy: 'always'</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="ActivatedRoute: snapshot vs paramMap (riuso del componente)" level="intermedio">
        <nav aria-label="Demo ActivatedRoute" class="flex flex-wrap gap-2">
          <a class="btn" routerLink="compare/1">compare/1</a>
          <a class="btn" routerLink="compare/2">compare/2</a>
          <a class="btn" routerLink="compare/3">compare/3</a>
        </nav>
        <sbu-code [code]="code.activatedRoute" />
        <p note>
          Passa da compare/1 a compare/2: stessa route config → il router RIUSA l'istanza (RouteReuseStrategy di default).
          Il constructor non rigira, quindi <code>snapshot</code> resta fermo; <code>paramMap</code> emette il nuovo
          valore. Lo snapshot va bene solo se il componente non può essere riusato con altri parametri.
        </p>
        <p note>
          <code>paramMap.get()</code> restituisce <code>string | null</code>, <code>getAll()</code> per valori ripetuti.
          L'<code>ActivatedRoute</code> iniettato è quello della rotta che ha creato il componente (o del suo antenato
          routed più vicino).
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="Navigazione programmatica: navigate, navigateByUrl, UrlTree" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="navigateRelative()">navigate relativo</button>
          <button type="button" class="btn" (click)="navigateByUrlString()">navigateByUrl stringa</button>
          <button type="button" class="btn" (click)="navigateByTree()">navigateByUrl UrlTree</button>
        </div>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt>serializeUrl(createUrlTree(…))</dt>
          <dd><code>{{ previewUrl }}</code></dd>
          <dt>esito</dt>
          <dd role="status">{{ navigationResult() }}</dd>
        </dl>
        <sbu-code [code]="code.programmatic" />
        <p note>
          <code>navigate</code> accetta comandi come <code>routerLink</code> ma, a differenza del link, NON è relativo di
          default: senza <code>relativeTo</code> parte dalla root. <code>navigateByUrl</code> vuole sempre un URL assoluto.
          Entrambi restituiscono <code>Promise&lt;boolean&gt;</code>: <code>false</code> se una guard blocca.
        </p>
        <p note>
          Nelle guard restituisci un <code>UrlTree</code> invece di chiamare <code>navigate</code>: il router annulla la
          navigazione corrente e gestisce il redirect senza navigazioni sovrapposte.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="CanActivateFn, CanActivateChildFn, UrlTree e RedirectCommand" level="avanzato">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn" [attr.aria-pressed]="session.loggedIn()" (click)="toggleLogin()">
            Loggato: {{ session.loggedIn() ? 'sì' : 'no' }}
          </button>
          <nav aria-label="Demo guard" class="flex flex-wrap gap-2">
            <a class="btn" routerLink="admin">admin (canActivate)</a>
            <a class="btn" routerLink="settings">settings (shell libera)</a>
            <a class="btn" routerLink="settings/profile">settings/profile (canActivateChild)</a>
          </nav>
        </div>
        <sbu-code [code]="code.guards" />
        <p note>
          Da non loggato: redirect a login con <code>returnUrl</code>. Dentro settings, passare da Profilo a Privacy fa
          rigirare <code>canActivateChild</code>, mentre <code>canActivate</code> del padre non rigira. Le guard sono
          semplici funzioni: <code>inject()</code> funziona perché il router le esegue in injection context.
        </p>
        <p note>
          Ordine: <code>canMatch</code> → <code>canDeactivate</code> (dal figlio al padre) → <code>canActivateChild</code> /
          <code>canActivate</code> (dal padre al figlio) → <code>resolve</code>. <code>RedirectCommand</code> (v18) aggiunge
          opzioni al redirect: <code>replaceUrl</code>, <code>skipLocationChange</code>, <code>browserUrl</code>,
          <code>state</code>. <code>CanLoad</code> è deprecato: usa <code>canMatch</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="CanDeactivateFn: modifiche non salvate" level="avanzato">
        <nav aria-label="Demo canDeactivate" class="flex flex-wrap gap-2">
          <a class="btn" routerLink="editor">Apri editor</a>
          <a class="btn" routerLink=".">Esci dall'editor</a>
        </nav>
        <sbu-code [code]="code.canDeactivate" />
        <p note>
          Scrivi nel titolo e poi clicca un qualsiasi link: la navigazione resta SOSPESA sulla Promise finché non scegli.
          La guard riceve l'istanza del componente, tipizzata su un'interfaccia per poterla riusare.
        </p>
        <p note>
          Non copre reload, chiusura del tab o URL digitato a mano: lì serve <code>beforeunload</code>. Con il tasto Back
          il browser ha già cambiato URL: il router lo ripristina se la guard restituisce false.
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="CanMatchFn: feature flag sullo stesso path" level="avanzato">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="btn" [attr.aria-pressed]="session.beta()" (click)="toggleBeta()">
            Beta: {{ session.beta() ? 'attiva' : 'disattiva' }}
          </button>
          <a class="btn" routerLink="dashboard">dashboard</a>
          <button type="button" class="btn" (click)="reloadCurrentRoute()">Rinaviga URL corrente (reload)</button>
        </div>
        <sbu-code [code]="code.canMatch" />
        <p note>
          <code>canMatch</code> false non annulla la navigazione: il router passa alla route successiva con lo stesso path.
          Il chunk di <code>dashboard-beta</code> non viene scaricato finché il flag è spento, ma solo senza preloading:
          <code>PreloadAllModules</code> lo scaricherebbe comunque (il preloader rispetta <code>canLoad</code>, non
          <code>canMatch</code>).
        </p>
        <p note>
          Cambiare il flag stando su /routing/dashboard non cambia nulla: il match avviene solo navigando. Riclicca il link:
          <code>NavigationSkipped</code> (stesso URL). Con <code>onSameUrlNavigation: 'reload'</code> il riconoscimento
          riparte e sceglie l'altra config.
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="ResolveFn e runGuardsAndResolvers" level="avanzato">
        <nav aria-label="Demo resolver" class="flex flex-wrap gap-2">
          <a class="btn" routerLink="products/1">products/1</a>
          <a class="btn" routerLink="products/3">products/3</a>
          <a class="btn" routerLink="products/4">products/4 (inesistente)</a>
        </nav>
        <p class="mt-3 text-sm">
          Chiamate a ProductApi (resolver): <strong>{{ productApi.calls() }}</strong>
        </p>
        <sbu-code [code]="code.resolver" />
        <p note>
          Il resolver BLOCCA la navigazione (~400ms: guarda "navigazione in corso" nell'area demo) e il componente nasce
          con i dati pronti. Per UI immediata con loading, meglio caricare nel componente (<code>resource</code>).
          products/4 → <code>RedirectCommand</code> verso la 404 mantenendo l'URL richiesto nella barra.
        </p>
        <p note>
          <code>runGuardsAndResolvers</code>: <code>paramsChange</code> (default: path + matrix),
          <code>pathParamsChange</code>, <code>pathParamsOrQueryParamsChange</code>, <code>paramsOrQueryParamsChange</code>,
          <code>always</code> o una funzione <code>(from, to) =&gt; boolean</code>. Qui cambiare solo <code>?tab</code> NON
          riesegue il resolver: prova i link <code>?tab=</code> nel dettaglio, il contatore non sale.
        </p>
      </sbu-example>

      <sbu-example [n]="12" title="Eventi del router e currentNavigation()" level="avanzato">
        <button type="button" class="btn" (click)="navigateToBrokenRoute()">Naviga a una rotta rotta (errore)</button>
        <p class="mt-2 text-sm" role="status">{{ navigationError() }}</p>
        <ol role="log" aria-label="Eventi di navigazione" class="mt-3 max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          @for (line of navigationLog(); track $index) {
            <li>{{ line }}</li>
          }
        </ol>
        <sbu-code [code]="code.events" />
        <p note>
          Sequenza completa: NavigationStart → RouteConfigLoadStart/End (lazy) → RoutesRecognized → GuardsCheckStart/End →
          ResolveStart/End → ActivationStart/End → NavigationEnd. Un redirect da guard produce
          <code>NavigationCancel</code> e una NUOVA NavigationStart.
        </p>
        <p note>
          <code>router.events</code> è un Observable caldo: gli eventi passati non vengono riemessi. Per lo stato corrente
          usa i signal <code>currentNavigation()</code> e <code>lastSuccessfulNavigation()</code>
          (<code>getCurrentNavigation()</code> è deprecato dalla v20.2).
        </p>
      </sbu-example>

      <sbu-example [n]="13" title="provideRouter: feature e TitleStrategy (app.config)" level="avanzato">
        <sbu-code [code]="code.appConfig" />
        <p note>
          Solo codice: queste feature si configurano UNA volta in <code>app.config.ts</code>. Questo lab usa
          <code>withComponentInputBinding()</code>; con <code>withViewTransitions</code> il browser anima il cambio rotta
          (fallback silenzioso se non supportato).
        </p>
        <p note>
          <code>paramsInheritanceStrategy: 'always'</code>: un figlio vede params, data e resolve di TUTTI gli antenati
          (default <code>emptyOnly</code>: solo da padri con path vuoto o senza componente).
          <code>PreloadAllModules</code> precarica <code>loadChildren</code> e <code>loadComponent</code>, anche dietro
          <code>canMatch</code>/<code>canActivate</code>: per strategie selettive implementa
          <code>PreloadingStrategy</code> (es. leggendo <code>route.data</code>). <code>TitleStrategy</code> custom: prefissi/suffissi o traduzioni del title.
        </p>
      </sbu-example>

      <section
        aria-labelledby="routing-outlet-heading"
        class="sticky bottom-0 z-10 rounded-xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border px-4 py-2 text-sm">
          <h2 id="routing-outlet-heading" class="font-semibold">Area demo · router-outlet</h2>
          <p aria-live="polite">URL: <code>{{ currentUrl() }}</code></p>
          <p>title: <code>{{ currentTitle() }}</code></p>
          <p>state: <code>{{ navigationState() | json }}</code></p>
          <p role="status">{{ isNavigating() ? 'Navigazione in corso…' : '' }}</p>
        </div>
        <div tabindex="0" role="region" aria-label="Rotta figlia attiva" class="max-h-[35vh] overflow-auto p-4 focus-visible:outline-2 focus-visible:outline-ring">
          <router-outlet />
        </div>
      </section>
    </sbu-lab-page>
  `,
})
export default class RoutingPage {
  protected readonly code = CODE;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly titleStrategy = inject(TitleStrategy);
  protected readonly session = inject(DemoSession);
  protected readonly productApi = inject(ProductApi);

  // Area demo: stato del router come signal
  protected readonly isNavigating = computed(() => this.router.currentNavigation() !== null);
  private readonly lastNavigation = this.router.lastSuccessfulNavigation;
  protected readonly currentUrl = computed(() => {
    const finalUrl = this.lastNavigation()?.finalUrl;
    return finalUrl ? this.router.serializeUrl(finalUrl) : this.router.url;
  });
  protected readonly currentTitle = computed(() => {
    this.lastNavigation(); // dipendenza: ricalcola a ogni navigazione riuscita
    return this.titleStrategy.buildTitle(this.router.routerState.snapshot) ?? '—';
  });
  protected readonly navigationState = computed(() => this.lastNavigation()?.extras.state ?? null);

  // 4. isActive
  protected readonly productIds = [1, 2, 3];
  protected readonly productsActive = isActive(
    this.router.createUrlTree(['products'], { relativeTo: this.route }),
    this.router,
  );

  // 7. navigazione programmatica
  private readonly previewTree = this.router.createUrlTree(['products', 3], {
    relativeTo: this.route,
    queryParams: { tab: 'specs' },
    fragment: 'dettagli',
  });
  protected readonly previewUrl = this.router.serializeUrl(this.previewTree);
  protected readonly navigationResult = signal('—');

  // 12. eventi
  protected readonly navigationLog = injectNavigationLog();
  protected readonly navigationError = signal('');

  protected async navigateRelative(): Promise<void> {
    const ok = await this.router.navigate(['products', 2], {
      relativeTo: this.route,
      queryParams: { tab: 'specs' },
    });
    this.navigationResult.set(`navigate(['products', 2], { relativeTo }) → ${ok}`);
  }

  protected async navigateByUrlString(): Promise<void> {
    const ok = await this.router.navigateByUrl('/routing/compare/3');
    this.navigationResult.set(`navigateByUrl('/routing/compare/3') → ${ok}`);
  }

  protected async navigateByTree(): Promise<void> {
    const ok = await this.router.navigateByUrl(this.previewTree);
    this.navigationResult.set(`navigateByUrl(UrlTree) → ${ok}`);
  }

  protected toggleLogin(): void {
    this.session.loggedIn.update((loggedIn) => !loggedIn);
  }

  protected toggleBeta(): void {
    this.session.beta.update((beta) => !beta);
  }

  protected reloadCurrentRoute(): void {
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }

  protected async navigateToBrokenRoute(): Promise<void> {
    try {
      await this.router.navigate(['broken'], { relativeTo: this.route });
      this.navigationError.set('');
    } catch (error) {
      this.navigationError.set(`Promise rigettata: ${String(error)}`);
    }
  }
}
