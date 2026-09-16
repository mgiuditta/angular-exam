import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, RedirectCommand, Router, UrlTree } from '@angular/router';
import { DemoSession } from './demo-session';

/** Helper chiamato DENTRO la guard: è ancora injection context, quindi `inject()` funziona. */
function loginUrlTree(returnUrl: string): UrlTree {
  return inject(Router).createUrlTree(['/routing/login'], { queryParams: { returnUrl } });
}

/**
 * CanActivateFn: decide se ENTRARE nella rotta.
 * `true` → prosegue · `false` → NavigationCancel, resti dove sei · `UrlTree` → redirect.
 */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(DemoSession).loggedIn() || loginUrlTree(state.url);

/**
 * CanActivateChildFn: messa sul PADRE, gira a ogni navigazione verso uno dei figli
 * (anche passando da un figlio all'altro). Il padre stesso non è protetto.
 * `RedirectCommand` = UrlTree + opzioni di navigazione (qui `replaceUrl`: il "Back" salta il redirect).
 */
export const authChildGuard: CanActivateChildFn = (_childRoute, state) =>
  inject(DemoSession).loggedIn() || new RedirectCommand(loginUrlTree(state.url), { replaceUrl: true });
