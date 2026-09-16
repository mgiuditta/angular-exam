import { Injectable, signal } from '@angular/core';

/**
 * Stato finto della demo: login e feature flag.
 *
 * NON è `providedIn: 'root'`: lo registra la rotta padre in `routing.routes.ts` (`providers`).
 * Vive quindi nell'EnvironmentInjector di quella rotta: guard, resolver, redirect e componenti
 * sotto /routing lo vedono, il resto dell'app no (NullInjectorError).
 */
@Injectable()
export class DemoSession {
  readonly loggedIn = signal(false);
  readonly beta = signal(false);
}
