import { HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import AdvancedPage from './advanced/advanced.page';
import DiPage from './di/di.page';
import DirectivesPage from './directives/directives.page';
import FormsPage from './forms/forms.page';
import GenericsPage from './generics/generics.page';
import LifecyclePage from './lifecycle/lifecycle.page';
import PipesPage from './pipes/pipes.page';
import RenderingPage from './rendering/rendering.page';
import RxjsPage from './rxjs/rxjs.page';
import SignalsPage from './signals/signals.page';
import TemplatesPage from './templates/templates.page';
import TypescriptTypesPage from './typescript-types/typescript-types.page';
import TypescriptPage from './typescript/typescript.page';
import { of } from 'rxjs';

// Routing e HTTP hanno bisogno di router/providers di rotta: smoke test nei loro spec.
// Smoke test: ogni pagina si renderizza senza errori di change detection (NG0100, NG0103, NG0600).
const pages: [string, Type<unknown>][] = [
  ['directives', DirectivesPage],
  ['pipes', PipesPage],
  ['templates', TemplatesPage],
  ['lifecycle', LifecyclePage],
  ['rendering', RenderingPage],
  ['rxjs', RxjsPage],
  ['signals', SignalsPage],
  ['forms', FormsPage],
  ['di', DiPage],
  ['generics', GenericsPage],
  ['advanced', AdvancedPage],
  ['typescript', TypescriptPage],
  ['typescript-types', TypescriptTypesPage],
];

describe('Pagine lab', () => {
  it.each(pages)('%s si renderizza', async (_, page) => {
    // necessario per i componenti con @defer: le dipendenze lazy vanno risolte prima
    await TestBed.configureTestingModule({
      imports: [page],
      // httpResource: niente rete nei test, un interceptor risponde subito
      providers: [provideHttpClient(withInterceptors([() => of(new HttpResponse({ status: 200, body: {} }))]))],
    }).compileComponents();
    const fixture = TestBed.createComponent(page);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBeTruthy();
    // un secondo giro con eventi: click su tutti i bottoni della pagina
    for (const button of fixture.nativeElement.querySelectorAll('button[type="button"]')) {
      (button as HTMLButtonElement).click();
    }
    await fixture.whenStable();
    fixture.destroy();
  });
});
