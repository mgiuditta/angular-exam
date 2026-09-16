import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LifecycleLog } from './lifecycle-log';
import { Probe } from './probe';

@Component({
  imports: [Probe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <sbu-probe [name]="name()"><em #projected>x</em></sbu-probe>
    }
  `,
})
class Host {
  readonly show = signal(true);
  readonly name = signal('P');
}

describe('Lifecycle', () => {
  it('chiama gli hook nell ordine documentato', async () => {
    const fixture = TestBed.createComponent(Host);
    const log = TestBed.inject(LifecycleLog);
    await fixture.whenStable();

    const entries = log.entries();
    const at = (text: string) => entries.findIndex((e) => e.includes(text));
    const order = [
      'constructor',
      'ngOnChanges',
      'ngOnInit',
      'ngAfterContentInit (contentChild: presente)',
      'ngAfterViewInit (viewChild: presente)',
      'afterNextRender',
    ].map(at);

    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('cambio input: ngOnChanges + effect, niente nuovo ngOnInit', async () => {
    const fixture = TestBed.createComponent(Host);
    const log = TestBed.inject(LifecycleLog);
    await fixture.whenStable();
    log.clear();

    fixture.componentInstance.name.set('Q');
    await fixture.whenStable();
    const entries = log.entries();
    expect(entries).toContain('[Q] ngOnChanges: "P" → "Q"');
    expect(entries).toContain('[Q] effect: name = "Q"');
    expect(entries.some((e) => e.includes('ngOnInit'))).toBe(false);
  });

  it('distruzione: ngOnDestroy e DestroyRef', async () => {
    const fixture = TestBed.createComponent(Host);
    const log = TestBed.inject(LifecycleLog);
    await fixture.whenStable();
    log.clear();

    fixture.componentInstance.show.set(false);
    await fixture.whenStable();
    expect(log.entries()).toEqual(
      expect.arrayContaining(['[P] ngOnDestroy', '[P] DestroyRef.onDestroy']),
    );
  });
});
