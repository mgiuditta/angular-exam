import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './auth.guards';
import { betaGuard } from './beta.guard';
import { CompareParams } from './compare-params';
import { DashboardClassic } from './dashboard-classic';
import { DemoHome } from './demo-home';
import { DemoSession } from './demo-session';
import { DraftEditor } from './draft-editor';
import { LoginDemo } from './login';
import { NotFound } from './not-found';
import { productResolver, productTitleResolver } from './product.resolvers';
import { ProductDetail } from './product-detail';
import RoutingPage from './routing.page';
import { unsavedChangesGuard } from './unsaved-changes.guard';

/**
 * Montato in app.routes.ts con `{ path: 'routing', loadChildren: () => import('./lab/routing/routing.routes') }`.
 * Tutti i path qui sotto sono RELATIVI a /routing. L'ORDINE conta: vince la prima route che fa match.
 */
export default [
  {
    path: '',
    component: RoutingPage,
    title: 'Routing',
    // Provider di rotta: EnvironmentInjector figlio creato quando la rotta si attiva, condiviso da
    // tutti i discendenti (anche lazy). Non viene distrutto quando si esce dalla rotta.
    providers: [DemoSession],
    children: [
      // '' + 'full': solo /routing esatto. Con 'prefix' (default) '' farebbe match con QUALSIASI URL.
      { path: '', pathMatch: 'full', component: DemoHome },

      // redirect stringa, relativo (senza '/'), con sostituzione del parametro
      { path: 'legacy/:id', redirectTo: 'products/:id' },
      // redirect funzione (v18+): injection context, può leggere params/queryParams/data
      { path: 'start', redirectTo: () => (inject(DemoSession).loggedIn() ? 'admin' : 'login') },

      {
        path: 'products/:id',
        component: ProductDetail,
        title: productTitleResolver,
        data: { section: 'Catalogo' },
        resolve: { product: productResolver },
        // default 'paramsChange': qui ignoriamo anche i matrix params, solo i path params rieseguono
        runGuardsAndResolvers: 'pathParamsChange',
      },
      { path: 'compare/:id', component: CompareParams, title: 'Snapshot vs paramMap' },

      { path: 'login', component: LoginDemo, title: 'Login' },
      {
        path: 'admin',
        title: 'Admin',
        canActivate: [authGuard],
        loadComponent: () => import('./admin-panel'),
      },
      { path: 'settings', loadChildren: () => import('./settings.routes') },

      { path: 'editor', component: DraftEditor, title: 'Editor', canDeactivate: [unsavedChangesGuard] },

      // stesso path due volte: canMatch sceglie la config, altrimenti si passa alla successiva
      {
        path: 'dashboard',
        title: 'Dashboard beta',
        canMatch: [betaGuard],
        loadComponent: () => import('./dashboard-beta'),
      },
      { path: 'dashboard', title: 'Dashboard', component: DashboardClassic },

      // chunk che non si carica: produce NavigationError
      { path: 'broken', loadComponent: () => Promise.reject(new Error('chunk non trovato (simulato)')) },

      { path: '**', component: NotFound, title: 'Pagina non trovata' },
    ],
  },
] satisfies Routes;
