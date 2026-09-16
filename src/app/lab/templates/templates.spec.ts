import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardList } from './card-list';
import { Repeat } from './repeat';
import { Unless } from './unless';

interface Item {
  id: number;
  name: string;
}

@Component({
  imports: [Unless, Repeat, CardList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p id="unless" *sbuUnless="hidden(); else other">visibile</p>
    <ng-template #other><p id="else">else</p></ng-template>

    <ul id="repeat">
      <li *sbuRepeat="let item of items(); trackBy: byId; index as i">{{ i }}-{{ item.name }}</li>
    </ul>

    <sbu-card-list id="cards" [items]="['x', 'y']">
      <ng-template let-value let-i="index">[{{ i }}:{{ value }}]</ng-template>
    </sbu-card-list>
  `,
})
class Host {
  readonly hidden = signal(false);
  readonly items = signal<readonly Item[]>([
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ]);
  readonly repeat = viewChild.required(Repeat);
  readonly byId = (item: Item) => item.id;
}

async function setup() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const all = (selector: string) =>
    [...fixture.nativeElement.querySelectorAll(selector)].map((e: Element) => e.textContent?.trim());
  return { fixture, host: fixture.componentInstance, all };
}

describe('Template e direttive strutturali', () => {
  it('sbuUnless alterna contenuto ed else', async () => {
    const { fixture, host, all } = await setup();
    expect(all('#unless')).toEqual(['visibile']);
    expect(all('#else')).toEqual([]);

    host.hidden.set(true);
    await fixture.whenStable();
    expect(all('#unless')).toEqual([]);
    expect(all('#else')).toEqual(['else']);
  });

  it('sbuRepeat espone il context e riusa le view con trackBy', async () => {
    const { fixture, host, all } = await setup();
    expect(all('#repeat li')).toEqual(['0-a', '1-b', '2-c']);
    const firstLi = fixture.nativeElement.querySelector('#repeat li');

    host.items.update((list) => [...list].reverse());
    await fixture.whenStable();
    expect(all('#repeat li')).toEqual(['0-c', '1-b', '2-a']);
    // stesso nodo DOM, solo spostato; nessuna nuova view
    expect(fixture.nativeElement.querySelectorAll('#repeat li')[2]).toBe(firstLi);
    expect(host.repeat().created).toBe(3);

    host.items.update((list) => [...list.slice(1), { id: 4, name: 'd' }]);
    await fixture.whenStable();
    expect(all('#repeat li')).toEqual(['0-b', '1-a', '2-d']);
    expect(host.repeat().created).toBe(4);
  });

  it('CardList usa il template proiettato con il context', async () => {
    const { all } = await setup();
    expect(all('#cards li')).toEqual(['[0:x]', '[1:y]']);
  });
});
