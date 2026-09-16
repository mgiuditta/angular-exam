import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DemoSession } from './demo-session';
import { DraftEditor } from './draft-editor';
import { ProductDetail } from './product-detail';
import RoutingPage from './routing.page';

/** Monta le rotte della pagina sotto /routing, come farà app.routes.ts. */
async function setup(initialUrl: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [{ path: 'routing', loadChildren: () => import('./routing.routes') }],
        withComponentInputBinding(),
      ),
    ],
  });
  const harness = await RouterTestingHarness.create(initialUrl);
  const router = TestBed.inject(Router);
  const text = (selector: string) =>
    harness.routeNativeElement?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  // DemoSession è un provider di ROTTA: lo prendo dall'injector del componente routed
  const session = () => harness.routeDebugElement!.injector.get(DemoSession);
  return { harness, router, text, session };
}

describe('Routing', () => {
  it('renderizza la pagina con la rotta figlia di default', async () => {
    const { harness, text } = await setup('/routing');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(RoutingPage);
    expect(text('h1')).toBe('Routing');
    expect(text('sbu-demo-home')).toContain('Nessuna demo attiva');
  });

  it('lega path param, query param, data e resolve agli input', async () => {
    const { harness, router, text } = await setup('/routing/products/2?tab=specs');
    const detail = harness.routeDebugElement!.query((el) => el.componentInstance instanceof ProductDetail);
    const component = detail.componentInstance as ProductDetail;
    expect(component.id()).toBe(2);
    expect(component.tab()).toBe('specs');
    expect(component.section()).toBe('Catalogo');
    expect(component.product().name).toBe('Monitor 27"');
    expect(text('sbu-product-detail h3')).toContain('Monitor 27"');
    expect(text('#routing-outlet-heading + p')).toBe('URL: /routing/products/2?tab=specs');
    expect(text('#routing-outlet-heading + p + p')).toBe('title: Prodotto #2');

    // ['..', id + 1] sale di un segmento di URL e mantiene la query (preserve)
    const next = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('nav[aria-label="Prodotti vicini"] a:last-child');
    expect(next?.getAttribute('href')).toBe('/routing/products/3?tab=specs');
    await harness.navigateByUrl('/routing/products/3');
    expect(router.url).toBe('/routing/products/3');
    expect(component.id()).toBe(3); // stessa istanza riusata
    expect(component.tab()).toBeUndefined();
  });

  it('redirect: stringa con parametro e funzione con inject', async () => {
    const { harness, router, session } = await setup('/routing/legacy/1');
    expect(router.url).toBe('/routing/products/1');

    await harness.navigateByUrl('/routing/start');
    expect(router.url).toBe('/routing/login');

    session().loggedIn.set(true);
    await harness.navigateByUrl('/routing/start');
    expect(router.url).toBe('/routing/admin');
  });

  it('authGuard reindirizza al login con returnUrl, poi lascia passare', async () => {
    const { harness, router, text, session } = await setup('/routing/admin');
    expect(router.url).toBe('/routing/login?returnUrl=%2Frouting%2Fadmin');
    expect(text('sbu-login-demo')).toContain('/routing/admin');

    session().loggedIn.set(true);
    await harness.navigateByUrl('/routing/settings/privacy');
    expect(text('sbu-settings-section')).toContain('Privacy');
  });

  it('canActivateChild protegge i figli ma non la shell', async () => {
    const { harness, router, text } = await setup('/routing/settings');
    expect(text('sbu-settings-shell h3')).toContain('Impostazioni');

    await harness.navigateByUrl('/routing/settings/profile');
    expect(router.url).toBe('/routing/login?returnUrl=%2Frouting%2Fsettings%2Fprofile');
  });

  it('resolver: prodotto inesistente → RedirectCommand verso la 404', async () => {
    const { router, text } = await setup('/routing/products/4');
    expect(text('sbu-not-found h3')).toContain('404');
    expect(router.url).toBe('/routing/not-found');
  });

  it('canMatch sceglie il componente in base al flag', async () => {
    const { router, text, session } = await setup('/routing/dashboard');
    expect(text('sbu-dashboard-classic h3')).toBe('Dashboard classica');

    session().beta.set(true);
    // stesso URL: serve 'reload', altrimenti NavigationSkipped e il match non si ripete
    expect(await router.navigateByUrl(router.url, { onSameUrlNavigation: 'reload' })).toBe(true);
    await vi.waitFor(() => expect(text('sbu-dashboard-beta h3')).toBe('Dashboard BETA'));
  });

  it('canDeactivate sospende la navigazione finché non si sceglie', async () => {
    const { harness, router } = await setup('/routing/editor');
    const root = harness.routeNativeElement!;
    const input = root.querySelector<HTMLInputElement>('sbu-draft-editor input')!;
    input.value = 'bozza';
    input.dispatchEvent(new Event('input'));
    const editor = harness.routeDebugElement!.query((el) => el.componentInstance instanceof DraftEditor);
    expect(editor).toBeTruthy();

    // resta: la Promise della guard risolve false
    const stay = router.navigateByUrl('/routing/compare/1');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.querySelector('[role="alertdialog"]')).toBeTruthy();
    });
    expect(root.querySelector('[role="alertdialog"] code')?.textContent).toBe('/routing/compare/1');
    root.querySelector<HTMLButtonElement>('[role="alertdialog"] button')!.click();
    expect(await stay).toBe(false);
    expect(router.url).toBe('/routing/editor');

    // esci senza salvare: la navigazione prosegue
    const leave = router.navigateByUrl('/routing/compare/1');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.querySelector('[role="alertdialog"]')).toBeTruthy();
    });
    root.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')[1].click();
    expect(await leave).toBe(true);
    expect(router.url).toBe('/routing/compare/1');
  });

  it('una navigazione fallita rigetta la Promise e non cambia URL', async () => {
    const { router } = await setup('/routing');
    await expect(router.navigateByUrl('/routing/broken')).rejects.toThrow('chunk non trovato');
    expect(router.url).toBe('/routing');
  });
});
