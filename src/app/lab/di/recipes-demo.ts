import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_CONFIG, AppConfig, GREETING } from './app-config';
import { Logger, ShoutLogger } from './logger';

/**
 * ESEMPIO 3 — Ricette di provider: useClass, useValue, useFactory
 *
 * - `useClass`: "quando chiedono Logger, istanzia ShoutLogger" (le sue dipendenze via inject()).
 * - `useValue`: oggetto già pronto, nessuna istanziazione (config, costanti, mock nei test).
 * - `useFactory`: funzione chiamata in injection context → può usare inject().
 *   Viene chiamata UNA volta per injector, il risultato è messo in cache.
 * - `providers: [ShoutLogger]` è la forma breve di `{ provide: ShoutLogger, useClass: ShoutLogger }`.
 */
@Component({
  selector: 'sbu-di-recipes-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: Logger, useClass: ShoutLogger },
    { provide: APP_CONFIG, useValue: { appName: 'Eserciziario', retries: 3 } satisfies AppConfig },
    {
      provide: GREETING,
      useFactory: () => {
        const config = inject(APP_CONFIG); // provider fratello, stesso injector
        return `Benvenuto in ${config.appName} (${config.retries} tentativi)`;
      },
    },
  ],
  template: `
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>inject(Logger) · useClass</dt>
      <dd><code>{{ logger.id }}</code></dd>
      <dt>inject(APP_CONFIG) · useValue</dt>
      <dd><code>{{ config.appName }}</code>, retries {{ config.retries }}</dd>
      <dt>inject(GREETING) · useFactory</dt>
      <dd>{{ greeting }}</dd>
    </dl>
    <button type="button" class="btn mt-3" (click)="logger.log('ciao dal logger')">logger.log('ciao dal logger')</button>
    <div role="log" tabindex="0" aria-label="Righe del logger" class="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-2 font-mono text-xs focus-visible:outline-2 focus-visible:outline-ring">
      <ol>
        @for (line of logger.lines(); track $index) {
          <li>{{ line }}</li>
        }
      </ol>
    </div>
  `,
})
export class RecipesDemo {
  protected readonly logger = inject(Logger);
  protected readonly config = inject(APP_CONFIG);
  protected readonly greeting = inject(GREETING);
}
