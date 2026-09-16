import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';

// Nessun zone.js installato: Angular 21 è zoneless di default.
// Il change detection parte solo da: signal letti nel template, eventi del template,
// markForCheck(), async pipe, input cambiati. Tenerlo a mente in tutti gli esempi.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()), // richiesto da httpResource (pagina Signal)
  ],
};
