import { Routes } from '@angular/router';

// Ogni pagina è lazy: il chunk viene scaricato solo alla prima navigazione.
export const routes: Routes = [
  { path: 'directives', loadComponent: () => import('./lab/directives/directives.page') },
  { path: 'pipes', loadComponent: () => import('./lab/pipes/pipes.page') },
  { path: 'templates', loadComponent: () => import('./lab/templates/templates.page') },
  { path: 'lifecycle', loadComponent: () => import('./lab/lifecycle/lifecycle.page') },
  { path: 'rendering', loadComponent: () => import('./lab/rendering/rendering.page') },
  { path: 'rxjs', loadComponent: () => import('./lab/rxjs/rxjs.page') },
  { path: 'signals', loadComponent: () => import('./lab/signals/signals.page') },
  { path: 'forms', loadComponent: () => import('./lab/forms/forms.page') },
  // loadChildren: queste pagine hanno rotte figlie o providers di rotta (HttpClient dedicato)
  { path: 'http', loadChildren: () => import('./lab/http/http.routes') },
  { path: 'routing', loadChildren: () => import('./lab/routing/routing.routes') },
  { path: 'di', loadComponent: () => import('./lab/di/di.page') },
  { path: 'generics', loadComponent: () => import('./lab/generics/generics.page') },
  { path: 'advanced', loadComponent: () => import('./lab/advanced/advanced.page') },
  { path: 'typescript', loadComponent: () => import('./lab/typescript/typescript.page') },
  {
    path: 'typescript-types',
    loadComponent: () => import('./lab/typescript-types/typescript-types.page'),
  },
  { path: '', pathMatch: 'full', redirectTo: 'directives' },
  { path: '**', redirectTo: 'directives' },
];
