import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClickOutside } from './click-outside';
import { Highlight } from './highlight';
import { Tooltip } from './tooltip';

@Component({
  imports: [Highlight, ClickOutside, Tooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p id="default" sbuHighlight>a</p>
    <p id="bound" [sbuHighlight]="color()">b</p>
    <div id="inside" sbuClickOutside (clickOutside)="outside.set(outside() + 1)">in</div>
    <button id="outside" type="button">out</button>
    @if (tooltipAlive()) {
      <button id="tip-host" type="button" sbuTooltip="ciao">tip</button>
    }
  `,
})
class Host {
  readonly color = signal('rgb(255, 0, 0)');
  readonly outside = signal(0);
  readonly tooltipAlive = signal(true);
}

async function setup() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  return { fixture, el };
}

describe('Direttive di attributo', () => {
  it('Highlight usa il default per attributo vuoto e segue il binding', async () => {
    const { fixture, el } = await setup();
    expect(el('default').style.backgroundColor).toBe('rgb(254, 240, 138)');
    expect(el('bound').style.backgroundColor).toBe('rgb(255, 0, 0)');

    fixture.componentInstance.color.set('rgb(0, 0, 255)');
    await fixture.whenStable();
    expect(el('bound').style.backgroundColor).toBe('rgb(0, 0, 255)');
  });

  it('ClickOutside emette solo per click esterni', async () => {
    const { fixture, el } = await setup();
    el('inside').click();
    el('outside').click();
    expect(fixture.componentInstance.outside()).toBe(1);
  });

  it('Tooltip viene rimosso dal body quando l host è distrutto (DestroyRef)', async () => {
    const { fixture, el } = await setup();
    el('tip-host').dispatchEvent(new Event('mouseenter'));
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe('ciao');

    fixture.componentInstance.tooltipAlive.set(false);
    await fixture.whenStable();
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
  });
});
