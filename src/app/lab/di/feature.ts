import {
  DestroyRef,
  EnvironmentProviders,
  Injectable,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { DiLog } from './di-log';
import { nextInstanceId } from './instance-id';

/** Servizio di una "feature": senza providedIn, arriva solo tramite provideLabFeature(). */
@Injectable()
export class FeatureService {
  readonly id = nextInstanceId('FeatureService');

  constructor() {
    const log = inject(DiLog);
    log.add(`${this.id} creato`);
    inject(DestroyRef).onDestroy(() => log.add(`${this.id} distrutto`));
  }
}

/**
 * ESEMPIO 9 — Pattern `provideXxx()` (come provideRouter, provideHttpClient)
 *
 * - `makeEnvironmentProviders` restituisce `EnvironmentProviders`: il tipo IMPEDISCE di usarli nei
 *   `providers` di un componente (errore di compilazione). Vanno in app.config, route o
 *   createEnvironmentInjector.
 * - `provideEnvironmentInitializer(fn)`: gira (in injection context) quando l'environment injector
 *   viene creato. Qui rende il servizio EAGER invece che lazy.
 * - `provideAppInitializer(fn)`: simile ma solo in bootstrap, e se restituisce Promise/Observable
 *   l'app aspetta prima di renderizzare.
 */
export function provideLabFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    FeatureService,
    provideEnvironmentInitializer(() => {
      const feature = inject(FeatureService);
      inject(DiLog).add(`initializer: ${feature.id} pronto`);
    }),
  ]);
}
