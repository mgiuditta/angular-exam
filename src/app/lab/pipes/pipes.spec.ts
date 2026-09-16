import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FilterImpurePipe, FilterPurePipe } from './filter-pipes';
import { TruncatePipe } from './truncate-pipe';

@Component({
  imports: [FilterPurePipe, FilterImpurePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span id="pure">{{ (items() | filterPure: 'a').length }}</span>
    <span id="impure">{{ (items() | filterImpure: 'a').length }}</span>
    <button type="button" (click)="0">cd</button>
  `,
})
class Host {
  readonly items = signal<string[]>(['mela']);
}

describe('Pipe', () => {
  it('truncate taglia oltre il massimo e rispetta il suffisso', () => {
    const pipe = new TruncatePipe();
    expect(pipe.transform('abcdef', 3)).toBe('abc…');
    expect(pipe.transform('abc', 3)).toBe('abc');
    expect(pipe.transform('abcdef', 3, '...')).toBe('abc...');
    expect(pipe.transform(null)).toBe('');
  });

  it('pura ignora la mutazione, impura no; entrambe vedono un nuovo riferimento', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const text = (id: string) => fixture.nativeElement.querySelector(`#${id}`).textContent;

    // mutazione + evento del template (marca la view dirty senza cambiare il riferimento)
    fixture.componentInstance.items().push('banana');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(text('pure')).toBe('1');
    expect(text('impure')).toBe('2');

    fixture.componentInstance.items.update((list) => [...list, 'arancia']);
    await fixture.whenStable();
    expect(text('pure')).toBe('3');
    expect(text('impure')).toBe('3');
  });
});
