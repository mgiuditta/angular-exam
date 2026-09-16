import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CdParent } from './cd-parent';
import { DetachedTicker } from './detached-ticker';
import RenderingPage from './rendering.page';
import { TrackDemo } from './track-demo';
import { ASYNC_DELAY_MS, ZonelessDemo } from './zoneless-demo';

type Fixture = { nativeElement: HTMLElement; whenStable(): Promise<unknown> };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function text(root: Element, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? '';
}

async function clickButton(fixture: Fixture, label: string, root: Element = fixture.nativeElement): Promise<void> {
  const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(label));
  if (!button) throw new Error(`Bottone "${label}" non trovato`);
  button.click();
  await fixture.whenStable();
}

describe('Change detection e rendering', () => {
  it('la pagina si renderizza e regge il click su tutti i bottoni senza errori', async () => {
    // Gli errori negli hook di render (es. trigger @defer) vanno all'ErrorHandler, non fanno fallire il test da soli.
    const errors: unknown[] = [];
    await TestBed.configureTestingModule({
      imports: [RenderingPage],
      providers: [{ provide: ErrorHandler, useValue: { handleError: (error: unknown) => errors.push(error) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(RenderingPage);
    await fixture.whenStable();
    expect(text(fixture.nativeElement, 'h1')).toBe('Change detection e rendering');

    for (const button of fixture.nativeElement.querySelectorAll('button[type="button"]')) {
      (button as HTMLButtonElement).click();
    }
    await fixture.whenStable();
    await sleep(ASYNC_DELAY_MS + 100); // lascia scattare i timer delle demo
    await fixture.whenStable();
    fixture.destroy();
    expect(errors).toEqual([]);
  });

  describe('OnPush vs Eager', () => {
    async function setup() {
      const fixture = TestBed.createComponent(CdParent);
      await fixture.whenStable();
      const [onPush, eager] = ['sbu-user-card-onpush', 'sbu-user-card-eager'].map(
        (selector) => fixture.nativeElement.querySelector(selector) as HTMLElement,
      );
      return { fixture, onPush, eager };
    }

    it('mutazione in place: padre ed Eager aggiornati, OnPush no', async () => {
      const { fixture, onPush, eager } = await setup();
      await clickButton(fixture, 'Muta');

      expect(text(fixture.nativeElement, '[data-testid="parent-name"]')).toBe('Grace');
      expect(text(eager, '[data-testid="name"]')).toBe('Grace');
      expect(text(onPush, '[data-testid="name"]')).toBe('Ada');
    });

    it('evento dentro la card OnPush: la view si aggiorna e mostra la mutazione', async () => {
      const { fixture, onPush } = await setup();
      await clickButton(fixture, 'Muta');
      await clickButton(fixture, 'Click nel figlio', onPush);

      expect(text(onPush, '[data-testid="name"]')).toBe('Grace');
    });

    it('nuovo riferimento: entrambe le card aggiornate', async () => {
      const { fixture, onPush, eager } = await setup();
      await clickButton(fixture, 'Nuovo oggetto');

      expect(text(eager, '[data-testid="name"]')).toBe('Grace');
      expect(text(onPush, '[data-testid="name"]')).toBe('Grace');
    });

    it('il contatore di render della card OnPush non cresce se la card è saltata', async () => {
      const { fixture, onPush, eager } = await setup();
      const renders = (card: HTMLElement) => text(card, '[sbuRenderCounter]');
      const onPushBefore = renders(onPush);
      const eagerBefore = renders(eager);
      // il giro di verifica checkNoChanges (dev mode) non esegue gli hook: nessun doppio conteggio
      expect(onPushBefore).toBe('render ×1');

      await clickButton(fixture, 'Muta');
      expect(renders(onPush)).toBe(onPushBefore);
      expect(renders(eager)).not.toBe(eagerBefore);
    });
  });

  it('zoneless: campo mutato in un timer non aggiorna la view senza markForCheck', async () => {
    const fixture = TestBed.createComponent(ZonelessDemo);
    await fixture.whenStable();
    const plain = () => text(fixture.nativeElement, '[data-testid="plain"]');

    await clickButton(fixture, 'setTimeout → plain++');
    await sleep(ASYNC_DELAY_MS + 100);
    await fixture.whenStable();
    expect(plain()).toBe('0');

    await clickButton(fixture, 'markForCheck()');
    await sleep(ASYNC_DELAY_MS + 100);
    await fixture.whenStable();
    expect(plain()).toBe('2');
  });

  it('detach: il signal cambia ma la view resta ferma fino a detectChanges', async () => {
    const fixture = TestBed.createComponent(DetachedTicker);
    await fixture.whenStable();
    const ticker = fixture.componentInstance;
    const ticks = () => text(fixture.nativeElement, '[data-testid="ticks"]');

    ticker.detach();
    ticker.toggle();
    await sleep(1100);
    await fixture.whenStable();
    expect(ticks()).toBe('0');

    ticker.detectChanges();
    expect(ticks()).toBe('1');
    ticker.toggle();
  });

  describe('@for track', () => {
    async function setup() {
      const fixture = TestBed.createComponent(TrackDemo);
      await fixture.whenStable();
      const list = (name: string) => fixture.nativeElement.querySelector(`[data-testid="list-${name}"]`) as HTMLElement;
      const inputs = (name: string) => [...list(name).querySelectorAll('input')];
      const stamps = (name: string) => [...list(name).querySelectorAll('sbu-view-stamp')].map((s) => s.textContent);
      return { fixture, inputs, stamps };
    }

    it('track item.id sposta il DOM con l elemento, track $index lo lascia in posizione', async () => {
      const { fixture, inputs, stamps } = await setup();
      inputs('id')[0].value = 'nota Ada';
      inputs('index')[0].value = 'nota Ada';
      const idStamps = stamps('id');
      const indexStamps = stamps('index');

      await clickButton(fixture, 'Inverti');

      expect(inputs('id').map((i) => i.value)).toEqual(['', '', 'nota Ada']);
      expect(stamps('id')).toEqual([...idStamps].reverse());
      expect(inputs('index').map((i) => i.value)).toEqual(['nota Ada', '', '']);
      expect(stamps('index')).toEqual(indexStamps);
    });

    it('track item ricrea tutte le righe con oggetti nuovi (warning NG0956)', async () => {
      const { fixture, stamps } = await setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const idStamps = stamps('id');
      const refStamps = stamps('ref');

      await clickButton(fixture, 'Ricarica');

      expect(stamps('id')).toEqual(idStamps);
      expect(stamps('ref').some((stamp) => refStamps.includes(stamp))).toBe(false);
      expect(warn.mock.calls.some(([message]) => String(message).includes('NG0956'))).toBe(true);
      warn.mockRestore();
    });

    it('@empty quando la lista è vuota', async () => {
      const { fixture } = await setup();
      await clickButton(fixture, 'Svuota');
      expect(fixture.nativeElement.textContent).toContain('Lista vuota (@empty).');
    });
  });
});
