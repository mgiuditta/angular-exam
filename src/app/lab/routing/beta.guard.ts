import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { DemoSession } from './demo-session';

/**
 * CanMatchFn: decide se questa route config può CORRISPONDERE all'URL.
 * `false` → il router prova la route successiva con lo stesso path (nessun NavigationCancel)
 * e il `loadComponent`/`loadChildren` di questa route NON viene scaricato.
 */
export const betaGuard: CanMatchFn = () => inject(DemoSession).beta();
