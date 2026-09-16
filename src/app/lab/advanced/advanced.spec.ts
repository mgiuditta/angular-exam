import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CURRENT_ROLE, RequireRole, Role } from './require-role';
import { Tab, Tabs } from './tabs';

@Component({
  imports: [Tabs, Tab, RequireRole],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: CURRENT_ROLE, useFactory: () => signal<Role>('guest') }],
  template: `
    <sbu-tabs label="Test" [(active)]="active">
      <ng-template sbuTab="Uno"><p class="panel">uno</p></ng-template>
      <ng-template sbuTab="Due"><p class="panel">due</p></ng-template>
    </sbu-tabs>

    <button id="edit" type="button" sbuRequireRole="editor">edit</button>
    <span id="admin" *sbuRequireRole="'admin'">admin</span>
  `,
})
class Host {
  readonly active = signal(0);
}

async function setup() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const q = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  const role = fixture.debugElement.injector.get(CURRENT_ROLE);
  return { fixture, q, role };
}

describe('Pattern avanzati', () => {
  it('Tabs mostra solo il pannello attivo e sincronizza [(active)]', async () => {
    const { fixture, q } = await setup();
    expect(q('.panel')?.textContent).toBe('uno');

    fixture.nativeElement.querySelectorAll('[role="tab"]')[1].click();
    await fixture.whenStable();
    expect(q('.panel')?.textContent).toBe('due');
    expect(fixture.componentInstance.active()).toBe(1);
  });

  it('Tabs supporta la navigazione da tastiera', async () => {
    const { fixture, q } = await setup();
    q('[role="tablist"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.active()).toBe(1);
    expect(q('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe('Due');
  });

  it('RequireRole: disabilita in forma attributo, rimuove in forma strutturale', async () => {
    const { fixture, q, role } = await setup();
    expect(q('#edit')?.hasAttribute('disabled')).toBe(true);
    expect(q('#admin')).toBeNull();

    role.set('admin');
    await fixture.whenStable();
    expect(q('#edit')?.hasAttribute('disabled')).toBe(false);
    expect(q('#admin')?.textContent).toBe('admin');
  });
});
