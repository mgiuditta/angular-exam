import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { CdParent } from './cd-parent';
import { DeferredCard } from './deferred-card';
import { DeferredDetails } from './deferred-details';
import { DetachedTicker } from './detached-ticker';
import { EncapsulationEmulated } from './encapsulation-emulated';
import { EncapsulationNone } from './encapsulation-none';
import { EncapsulationShadow } from './encapsulation-shadow';
import { MeasureBox } from './measure-box';
import { SignalWriteError } from './signal-write-error';
import { ToastStack } from './toast-stack';
import { TrackDemo } from './track-demo';
import { ZoneInfo } from './zone-info';
import { ZonelessDemo } from './zoneless-demo';

const CODE = {
  zoneless: ts`
    // ❌ NON aggiornano la view: nessuno notifica Angular
    plain = 0;
    setTimeout(() => this.plain++, 500);
    await wait(500); this.plain++;
    timer(500).subscribe(() => this.plain++);
    setTimeout(() => { this.plain++; this.appRef.tick(); }, 500); // tick salta le OnPush non marcate

    // ✅ aggiornano la view
    counter = signal(0);
    setTimeout(() => this.counter.update((n) => n + 1), 500);     // signal letto nel template
    setTimeout(() => { this.plain++; this.cdr.markForCheck(); }, 500);
    subject = new BehaviorSubject(0);                            // {{ subject | async }} → markForCheck interno
    <button (click)="onlyListener()">                            // listener del template
    host: { '(window:resize)': 'onResize()' }                    // listener host
    componentRef.setInput('title', 'Nuovo');                     // input impostato da codice
  `,
  onPush: ts`
    user = signal<MutableUser>({ name: 'Ada' });

    // ❌ stesso riferimento: il signal non notifica, [user] è === → la card OnPush viene saltata
    this.user().name = 'Grace';

    // ✅ nuovo riferimento: signal notifica, input cambiato → la card OnPush si aggiorna
    this.user.update((user) => ({ ...user, name: 'Grace' }));

    @Component({ changeDetection: ChangeDetectionStrategy.OnPush }) // scelta consigliata
    @Component({ changeDetection: ChangeDetectionStrategy.Eager })  // v21: nuovo nome di Default (deprecato)
  `,
  cdr: ts`
    private readonly cdr = inject(ChangeDetectorRef);

    this.cdr.markForCheck();   // marca view + ANTENATI dirty, CD pianificato (asincrono)
    this.cdr.detectChanges();  // CD SINCRONO di questa view e dei figli, anche se staccata
    this.cdr.detach();         // fuori dal CD: nessun aggiornamento automatico (nemmeno dai signal)
    this.cdr.reattach();       // di nuovo nel CD
    this.cdr.checkNoChanges(); // solo dev mode: lancia NG0100 se un binding è cambiato

    // Pattern: widget ad alta frequenza aggiornato a mano, a frame
    this.cdr.detach();
    const loop = () => { this.fps = measure(); this.cdr.detectChanges(); requestAnimationFrame(loop); };
  `,
  config: ts`
    // app.config.ts — Angular 21: zoneless è il default, il provider esplicito è facoltativo
    providers: [provideZonelessChangeDetection()]
    // angular.json: niente "zone.js" nei polyfills

    // App con zone.js (legacy): polyfills: ["zone.js"]
    providers: [provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true })]
    // eventCoalescing: più eventi nello stesso frame (es. click che fa bubbling) → un solo CD

    // Solo con zone.js: evitare un CD a ogni mousemove
    const ngZone = inject(NgZone);
    ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', (event) => {
        if (isInteresting(event)) ngZone.run(() => (this.x = event.x)); // rientra solo se serve
      });
    });

    const appRef = inject(ApplicationRef);
    appRef.tick();              // CD sincrono dalla root (NG0101 se chiamato durante un tick)
    await appRef.whenStable();  // nessun CD/task in sospeso (test, SSR)

    // Test zoneless: niente fixture.detectChanges() a mano
    await fixture.whenStable();
  `,
  errors: ts`
    // NG0100 ExpressionChangedAfterItHasBeenChecked — SOLO dev mode.
    // Dopo il CD Angular rilegge i binding (checkNoChanges): se un valore NON-signal è diverso → errore.
    @Component({ template: \`{{ now }}\` })
    class Clock {
      get now() { return Date.now(); }       // ❌ valore diverso a ogni lettura
    }

    @Component({ template: \`<sbu-child (ready)="loaded = true" /> {{ loaded }}\` })
    class Parent { loaded = false; }
    // Child.ngAfterViewInit() { this.ready.emit(); }  ❌ il padre è già stato verificato

    // ✅ Con un signal nessun NG0100: la view viene marcata e Angular fa un altro giro di render.
    loaded = signal(false);
    // ⚠ se ogni giro riscrive il signal → NG0103 (loop infinito di CD)

    // Controllo più severo in dev (anche OnPush non marcate, anche periodico per zoneless)
    providers: [provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })]

    // NG0600 — scrivere un signal dove Angular sta solo LEGGENDO
    double = computed(() => { this.count.set(1); return this.count() * 2; }); // ❌ computed
    <p>{{ count.set(1) }}</p>                                                 // ❌ template
    effect(() => this.log.update((log) => [...log, this.count()]));           // ✅ effect
    <button (click)="count.set(1)">                                           // ✅ event handler
  `,
  afterRender: ts`
    constructor() {                          // injection context obbligatorio
      afterNextRender({                      // una volta
        earlyRead: () => this.width(),
        write: (width) => (this.out.textContent = \`\${width}px\`),  // valore semplice
      });

      afterRenderEffect({                    // dopo il render, SOLO se i signal letti cambiano
        earlyRead: () => {
          this.text();                       // dipendenza
          return this.width();
        },
        write: (width, onCleanup) => {       // width è Signal<number>
          this.bar.style.width = \`\${width()}px\`;
        },
      });

      const ref = afterEveryRender({         // dopo OGNI render dell'app
        earlyRead: () => this.width(),
        write: (width) => (this.every.textContent = \`\${width}px\`),
      });
      // ref.destroy() per fermarlo prima della distruzione del componente
    }
    // Ordine fasi: earlyRead → write → mixedReadWrite → read. Callback singola = mixedReadWrite.
    // ❌ afterEveryRender(() => this.count.update(...)) con count nel template → render infinito
  `,
  deferTriggers: ts`
    @defer { … }                                  <!-- senza trigger = on idle -->
    @defer (on idle) { … }                        <!-- requestIdleCallback -->
    @defer (on immediate) { … }                   <!-- subito dopo il render (codice comunque in chunk) -->
    @defer (on timer(3s)) { … }                   <!-- ms o s -->
    @defer (on viewport) { … } @placeholder { <p>…</p> }  <!-- IntersectionObserver sul placeholder -->
    @defer (on hover) { … }                       <!-- mouseenter + focusin -->
    @defer (on interaction(loadButton)) { … }     <!-- click + keydown su #loadButton -->
    <button #loadButton type="button">Carica</button>
    @defer (on viewport; on timer(10s)) { … }     <!-- più trigger = OR -->
    @defer (when ready(); prefetch on hover) { … }<!-- when: una volta true, non torna indietro -->
  `,
  deferStates: ts`
    @defer (on interaction) {
      <sbu-deferred-details />                      <!-- contiene a sua volta un @defer (on timer) -->
    } @placeholder (minimum 500ms) {
      <button type="button" class="btn">Carica</button>
    } @loading (after 100ms; minimum 1s) {
      <p role="status">Caricamento…</p>            <!-- niente flicker: appare dopo 100ms, resta ≥ 1s -->
    } @error {
      <p>Impossibile caricare il componente</p>    <!-- chunk non scaricato -->
    }

    <!-- SSR con incremental hydration: provideClientHydration(withIncrementalHydration()) -->
    @defer (on idle; hydrate on interaction) { <sbu-comments /> }
    @defer (hydrate never) { <sbu-static-footer /> }

    // Test: controllo manuale degli stati
    TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
    const [block] = await fixture.getDeferBlocks();
    await block.render(DeferBlockState.Complete);
  `,
  track: ts`
    @for (item of items(); track item.id; let i = $index, isOdd = $odd) {
      <li [class.bg-muted]="isOdd">{{ i + 1 }}. {{ item.name }} <input /></li>
    } @empty {
      <li>Lista vuota</li>
    }

    <!-- variabili implicite: $index $count $first $last $even $odd -->
    <!-- alias (let i = $index) servono nei @for annidati per leggere l'indice esterno -->

    @for (item of items(); track $index) { … }  <!-- solo liste statiche o primitivi senza id -->
    @for (item of items(); track item) { … }    <!-- identità: oggetti nuovi → ricrea tutto (warning NG0956) -->
  `,
  animations: ts`
    <li animate.enter="toast-enter" animate.leave="toast-leave">…</li>
    <div [animate.enter]="enterClass()">…</div>          <!-- classe dinamica -->
    <div (animate.leave)="fadeOut($event)">…</div>       <!-- funzione (Web Animations, GSAP…) -->

    fadeOut(event: AnimationCallbackEvent) {
      const animation = event.target.animate([{ opacity: 1 }, { opacity: 0 }], 200);
      animation.onfinish = () => event.animationComplete(); // senza: rimosso solo al MAX_ANIMATION_TIMEOUT
    }

    .toast-enter { animation: toast-in 250ms ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .toast-enter, .toast-leave { animation: none; }       /* nessuna animazione → rimozione immediata */
    }

    // Legacy, deprecato dalla 20.2 (rimozione prevista in v23):
    // provideAnimationsAsync() + @angular/animations → trigger(), state(), transition(), [@fade]
  `,
  encapsulation: ts`
    @Component({
      encapsulation: ViewEncapsulation.Emulated,   // default → p[_ngcontent-xyz], [_nghost-xyz]
      host: { '[class.active]': 'active()' },
      styles: \`
        :host { display: block; }                   /* l'elemento <sbu-card> stesso */
        :host(.active) { border-color: blue; }      /* host con una classe (es. da host binding) */
        :host-context(.enc-contrast) { border-style: dashed; } /* un ANTENATO ha la classe */
        :host ::ng-deep .lib-x { … }                /* deprecato: buca l'incapsulamento verso i figli */
      \`,
    })

    ViewEncapsulation.None        // stili globali nel <head>, rimossi alla distruzione dell'ultima istanza
    ViewEncapsulation.ShadowDom   // shadow root: fuori i CSS globali, dentro custom property ed ereditarietà
  `,
  image: ts`
    import { NgOptimizedImage, provideImgixLoader } from '@angular/common';
    @Component({ imports: [NgOptimizedImage] })

    <!-- LCP / above the fold: priority → fetchpriority="high", niente lazy, warning se manca preconnect -->
    <img ngSrc="hero.jpg" width="1200" height="600" priority alt="Copertina" />

    <!-- dimensioni ignote: fill (il padre deve essere position relative/absolute/fixed) -->
    <div class="relative h-64"><img ngSrc="cover.jpg" fill alt="…" /></div>

    <!-- immagine fluida: sizes → srcset responsive generato dal loader -->
    <img ngSrc="card.jpg" width="400" height="300" sizes="(max-width: 768px) 100vw, 400px" alt="…" />

    <!-- placeholder sfocato durante il caricamento -->
    <img ngSrc="photo.jpg" width="800" height="600" placeholder alt="…" />          <!-- serve un loader -->
    <img ngSrc="photo.jpg" width="800" height="600" placeholder="data:image/png;base64,…" alt="…" />

    providers: [provideImgixLoader('https://example.imgix.net/')]  // oppure IMAGE_LOADER custom
  `,
};

/**
 * Pagina: CHANGE DETECTION E RENDERING
 *
 * Checklist certificazione:
 * - Zoneless (default v21): il CD parte SOLO da notifiche → signal nel template, listener (template/host),
 *   markForCheck (pipe async), input cambiati (anche ComponentRef.setInput), view attaccate.
 *   setTimeout/Promise/subscribe che mutano un campo semplice NON aggiornano nulla.
 * - OnPush: controllata se input con nuovo riferimento, evento interno, signal letto, markForCheck.
 *   Mutare un oggetto passato come input non basta. `Default` si chiama ora `Eager`.
 * - ChangeDetectorRef: markForCheck (asincrono, antenati), detectChanges (sincrono, figli),
 *   detach/reattach. ApplicationRef.tick() non aggiorna le OnPush non marcate.
 * - NG0100 (solo dev, valori non-signal cambiati dopo il check), NG0103 (loop), NG0600 (scrittura signal
 *   in computed/template).
 * - afterNextRender / afterEveryRender / afterRenderEffect con fasi earlyRead → write → mixedReadWrite → read.
 * - @defer: trigger (idle, immediate, timer, viewport, hover, interaction, when), prefetch,
 *   @placeholder (minimum), @loading (after, minimum), @error, annidamento, hydrate on (SSR).
 * - @for: track obbligatorio (id vs $index vs identità), $index $count $first $last $even $odd, @empty.
 * - animate.enter / animate.leave (v20.2+); @angular/animations deprecato.
 * - ViewEncapsulation Emulated/None/ShadowDom, :host, :host-context. NgOptimizedImage.
 */
@Component({
  selector: 'sbu-rendering-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Example,
    LabPage,
    CodeBlock,
    ZonelessDemo,
    CdParent,
    DetachedTicker,
    ZoneInfo,
    SignalWriteError,
    MeasureBox,
    DeferredCard,
    DeferredDetails,
    TrackDemo,
    ToastStack,
    EncapsulationEmulated,
    EncapsulationNone,
    EncapsulationShadow,
  ],
  template: `
    <sbu-lab-page heading="Change detection e rendering">
      <span intro>
        Quando Angular aggiorna il DOM (app zoneless) e come controllarlo: OnPush, ChangeDetectorRef, hook di render,
        &#64;defer, &#64;for, animazioni e stili. I badge "render ×n" lampeggiano a ogni refresh della view che li contiene.
      </span>

      <sbu-example [n]="1" title="Zoneless: chi fa partire il change detection">
        <sbu-zoneless-demo />
        <sbu-code [code]="code.zoneless" />
        <p note>
          Premi "setTimeout → plain++", aspetta mezzo secondo: il numero non cambia. Poi "Click a vuoto": il refresh
          mostra il valore già cambiato. Il campo era aggiornato, ma nessuno lo aveva notificato ad Angular.
        </p>
        <p note>
          <code>appRef.tick()</code> non basta: parte dalla root ma salta le view OnPush non marcate. Una Promise già
          risolta (microtask) partita da un click finisce prima del CD pianificato e "funziona per caso".
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="OnPush vs Eager: mutazione o nuovo riferimento" level="intermedio">
        <sbu-cd-parent />
        <sbu-code [code]="code.onPush" />
        <p note>
          "Muta": il padre si aggiorna (evento suo), la card Eager pure, la card OnPush no (input <code>===</code>).
          "Click nel figlio" della card OnPush: ora mostra il nome mutato. Il click in un figlio marca dirty lui e gli
          antenati, non i fratelli.
        </p>
        <p note>
          In v21 <code>ChangeDetectionStrategy.Default</code> è deprecato in favore di <code>Eager</code> (stesso valore).
          Con zoneless anche Eager si aggiorna solo quando il CD lo raggiunge: sotto un padre OnPush non dirty resta ferma.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="ChangeDetectorRef: detach, detectChanges, reattach" level="intermedio">
        <sbu-detached-ticker #ticker />
        <div class="mt-2 flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="ticker.toggle()">
            {{ ticker.running() ? 'Ferma' : 'Avvia' }} ticker
          </button>
          <button type="button" class="btn" [disabled]="!ticker.attached()" (click)="ticker.detach()">detach()</button>
          <button type="button" class="btn" (click)="ticker.detectChanges()">detectChanges()</button>
          <button type="button" class="btn" [disabled]="ticker.attached()" (click)="ticker.reattach()">reattach()</button>
        </div>
        <p class="mt-2 text-sm" role="status">View del ticker: {{ ticker.attached() ? 'attaccata' : 'staccata' }}</p>
        <sbu-code [code]="code.cdr" />
        <p note>
          Avvia, poi <code>detach()</code>: il signal continua a cambiare ma la view è ferma. Ogni
          <code>detectChanges()</code> mostra il valore corrente (un refresh sincrono). <code>reattach()</code> riprende.
        </p>
        <p note>
          <code>markForCheck()</code> sale verso la root (antenati), <code>detectChanges()</code> scende (figli).
          Su una view staccata <code>markForCheck()</code> e i signal non bastano: serve <code>detectChanges()</code> o
          <code>reattach()</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Configurazione: zoneless, zone.js, NgZone, ApplicationRef" level="avanzato">
        <sbu-zone-info />
        <sbu-code [code]="code.config" />
        <p note>
          Questa app non carica zone.js: <code>NgZone</code> è un no-op e <code>runOutsideAngular</code> non cambia nulla.
          Con zone.js ogni setTimeout/evento/XHR faceva partire un CD globale: da qui l'uso di
          <code>runOutsideAngular</code> per il lavoro ad alta frequenza.
        </p>
        <p note>
          Migrazione a zoneless: sostituire campi aggiornati in callback asincroni con signal, niente
          <code>NgZone.onStable</code>/<code>onMicrotaskEmpty</code> (non emettono), usare <code>afterNextRender</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="NG0100 e NG0600: errori di change detection" level="avanzato">
        <sbu-signal-write-error />
        <sbu-code [code]="code.errors" />
        <p note>
          NG0100 esiste solo in dev mode: in produzione il valore resta semplicemente "vecchio" fino al prossimo CD. I signal
          lo evitano perché la scrittura marca la view e provoca un nuovo giro invece di un valore incoerente.
        </p>
        <p note>
          NG0600: <code>computed</code> e template devono essere puri. <code>untracked(() =&gt; sig.set(…))</code>
          dentro un computed aggira il controllo ma resta un side effect: usa <code>effect</code> o
          <code>linkedSignal</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="afterNextRender, afterEveryRender, afterRenderEffect" level="avanzato">
        <sbu-measure-box />
        <sbu-code [code]="code.afterRender" />
        <p note>
          Scrivi nel campo: tutte le misure si aggiornano. Attiva "Font grande": solo <code>afterEveryRender</code> vede la
          nuova larghezza, perché <code>afterRenderEffect</code> dipende solo da <code>text()</code>. Per cambi di
          dimensione dovuti al layout usa <code>ResizeObserver</code>.
        </p>
        <p note>
          Non girano in SSR. Nei test (jsdom) girano, ma ogni misura vale 0. Scrivere il DOM a mano va bene solo su nodi
          senza binding Angular.
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="@defer: i trigger" level="intermedio">
        <button type="button" class="btn" (click)="recreateDeferTriggers()">Ricrea i blocchi</button>
        @for (run of [deferRun()]; track run) {
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <h3 class="mb-1 text-sm font-medium"><code>on idle</code></h3>
              @defer (on idle) {
                <sbu-deferred-card trigger="on idle" />
              } @placeholder {
                <p class="text-sm text-muted-foreground">In attesa che il browser sia libero…</p>
              }
            </div>

            <div>
              <h3 class="mb-1 text-sm font-medium"><code>on immediate</code></h3>
              @defer (on immediate) {
                <sbu-deferred-card trigger="on immediate" />
              } @placeholder {
                <p class="text-sm text-muted-foreground">Subito dopo il primo render…</p>
              }
            </div>

            <div>
              <h3 class="mb-1 text-sm font-medium"><code>on timer(3s)</code></h3>
              @defer (on timer(3s)) {
                <sbu-deferred-card trigger="on timer(3s)" />
              } @placeholder {
                <p class="text-sm text-muted-foreground">Tra 3 secondi…</p>
              }
            </div>

            <div>
              <h3 class="mb-1 text-sm font-medium"><code>on viewport</code></h3>
              @if (supportsViewport) {
                @defer (on viewport) {
                  <sbu-deferred-card trigger="on viewport" />
                } @placeholder {
                  <p class="text-sm text-muted-foreground">Quando questo paragrafo entra nello schermo…</p>
                }
              } @else {
                <p class="text-sm text-muted-foreground">IntersectionObserver non disponibile (es. jsdom).</p>
              }
            </div>

            <div>
              <h3 class="mb-1 text-sm font-medium"><code>on hover</code></h3>
              @defer (on hover) {
                <sbu-deferred-card trigger="on hover" />
              } @placeholder {
                <p tabindex="0" class="rounded-md border border-dashed border-border p-2 text-sm">
                  Passa sopra con il mouse o raggiungimi con Tab
                </p>
              }
            </div>

            <div>
              <h3 class="mb-1 text-sm font-medium"><code>on interaction(loadButton)</code></h3>
              <button #loadButton type="button" class="btn">Trigger esterno al blocco</button>
              @defer (on interaction(loadButton)) {
                <sbu-deferred-card trigger="on interaction(loadButton)" class="mt-2" />
              } @placeholder {
                <p class="mt-2 text-sm text-muted-foreground">Il trigger è il bottone qui sopra.</p>
              }
            </div>

            <div class="sm:col-span-2">
              <h3 class="mb-1 text-sm font-medium"><code>when ready(); prefetch on hover</code></h3>
              <button type="button" class="btn" [disabled]="deferReady()" (click)="deferReady.set(true)">
                ready.set(true)
              </button>
              @defer (when deferReady(); prefetch on hover) {
                <sbu-deferred-card trigger="when + prefetch on hover" class="mt-2" />
              } @placeholder {
                <p class="mt-2 text-sm text-muted-foreground">
                  Hover qui: scarica il chunk senza mostrarlo (guarda Network).
                </p>
              }
            </div>
          </div>
        }
        <sbu-code [code]="code.deferTriggers" />
        <p note>
          <code>on hover</code>, <code>on interaction</code> e <code>on viewport</code> senza riferimento osservano il
          <code>&#64;placeholder</code>, che deve avere UN solo elemento radice. Il riferimento (<code>#loadButton</code>)
          deve stare nella stessa view del blocco o in un antenato.
        </p>
        <p note>
          Tutti i blocchi usano lo stesso componente e quindi lo stesso chunk: <code>on immediate</code> lo scarica subito,
          gli altri aspettano solo il proprio trigger. <code>when</code> è a senso unico: tornare a false non rimuove il
          contenuto. Il componente lazy non deve essere usato fuori da &#64;defer nello stesso file.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="@defer: placeholder, loading, error, annidamento" level="avanzato">
        <button type="button" class="btn" (click)="statesRun.update(increment)">Ricrea il blocco</button>
        @for (run of [statesRun()]; track run) {
          <div class="mt-3">
            @defer (on interaction) {
              <sbu-deferred-details />
            } @placeholder (minimum 500ms) {
              <button type="button" class="btn">Carica i dettagli</button>
            } @loading (after 100ms; minimum 1s) {
              <p class="text-sm" role="status">Caricamento dettagli…</p>
            } @error {
              <p class="text-sm text-destructive" role="alert">Impossibile scaricare il componente.</p>
            }
          </div>
        }
        <sbu-code [code]="code.deferStates" />
        <p note>
          <code>minimum</code> sul placeholder evita il flash se il trigger scatta subito; <code>after</code> sul loading
          non lo mostra se il chunk arriva in meno di 100ms (in locale capita sempre: prova con Network → Slow 4G).
          Le dipendenze di &#64;placeholder e &#64;loading sono caricate subito, non in modo lazy.
        </p>
        <p note>
          Il &#64;defer annidato parte solo quando il blocco esterno è renderizzato. <code>hydrate on</code> (SSR): il
          markup arriva dal server e il JavaScript viene idratato al trigger.
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="@for: track e variabili contestuali" level="intermedio">
        <sbu-track-demo />
        <sbu-code [code]="code.track" />
        <p note>
          Scrivi negli input della prima riga delle prime due colonne, poi "Inverti": con <code>track item.id</code> il
          testo e il timbro <code>view #</code> seguono l'elemento; con <code>track $index</code> restano in cima e
          cambiano solo i nomi. "Ricarica" con <code>track item</code> ricrea tutte le righe (nuovi numeri, warning
          NG0956 in console).
        </p>
        <p note>
          Chiavi duplicate → warning NG0955. <code>track</code> è un'espressione, non una funzione:
          <code>track trackById($index, item)</code> è ammesso ma di solito basta <code>item.id</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="Animazioni native: animate.enter e animate.leave" level="intermedio">
        <sbu-toast-stack />
        <sbu-code [code]="code.animations" />
        <p note>
          <code>animate.leave</code> ritarda la rimozione dal DOM fino alla fine dell'animazione più lunga (animation o
          transition). Con <code>prefers-reduced-motion: reduce</code> le animazioni sono spente e l'elemento sparisce
          subito.
        </p>
        <p note>
          <code>&#64;angular/animations</code> e <code>provideAnimations[Async]()</code> sono deprecati dalla 20.2
          (rimozione prevista in v23) e non sono installati in questo progetto. Nei test <code>animate.*</code> è
          disattivato di default (<code>animationsEnabled</code> in TestBed).
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="ViewEncapsulation, :host e :host-context" level="intermedio">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" [attr.aria-pressed]="encContrast()" (click)="encContrast.set(!encContrast())">
            Classe .enc-contrast sul contenitore
          </button>
          <button type="button" class="btn" [attr.aria-pressed]="showNone()" (click)="showNone.set(!showNone())">
            Componente None presente
          </button>
        </div>
        <div class="mt-3 flex flex-col gap-2" [class.enc-contrast]="encContrast()">
          <sbu-encapsulation-emulated />
          @if (showNone()) {
            <sbu-encapsulation-none />
          }
          <sbu-encapsulation-shadow />
          <p class="sbu-enc-text text-sm">Paragrafo della pagina con la stessa classe <code>sbu-enc-text</code></p>
        </div>
        <sbu-code [code]="code.encapsulation" />
        <p note>
          Rimuovi il componente None: la sottolineatura sparisce ovunque (lo <code>&lt;style&gt;</code> viene tolto). Con la
          classe sul contenitore, <code>:host-context(.enc-contrast)</code> tratteggia i bordi.
        </p>
        <p note>
          ShadowDom: Tailwind non entra (il testo resta di dimensione normale), ma Angular copia nello shadow root gli
          stili dei componenti Emulated/None, quindi la sottolineatura None arriva anche lì.
        </p>
      </sbu-example>

      <sbu-example [n]="12" title="NgOptimizedImage">
        <sbu-code [code]="code.image" />
        <p note>
          Solo snippet: la pagina non usa immagini statiche. <code>ngSrc</code> al posto di <code>src</code>;
          <code>width</code>/<code>height</code> obbligatori (evitano layout shift) salvo <code>fill</code>. Lazy di
          default, <code>priority</code> per l'immagine LCP. Warning in dev per proporzioni distorte o immagini troppo grandi.
        </p>
        <p note>Non funziona con immagini inline base64 in <code>ngSrc</code> (il placeholder data URL invece sì, se piccolo).</p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class RenderingPage {
  protected readonly code = CODE;
  protected readonly increment = (n: number) => n + 1;

  // 7. @defer trigger. IntersectionObserver manca in jsdom (test): senza, `on viewport` lancerebbe un errore.
  protected readonly supportsViewport = typeof IntersectionObserver !== 'undefined';
  protected readonly deferRun = signal(1);
  protected readonly deferReady = signal(false);

  // 8. stati di @defer
  protected readonly statesRun = signal(1);

  // 11. incapsulamento
  protected readonly encContrast = signal(false);
  protected readonly showNone = signal(true);

  /** Nuovo valore di track → le view del @for vengono distrutte e ricreate con blocchi @defer nuovi. */
  protected recreateDeferTriggers(): void {
    this.deferReady.set(false);
    this.deferRun.update(this.increment);
  }
}
