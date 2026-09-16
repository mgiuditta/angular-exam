import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CodeBlock } from '../shared/code-block';
import { OperatorDemo } from './operators';

interface LogEntry {
  readonly id: number;
  readonly ms: number;
  readonly kind: 'next' | 'error' | 'complete' | 'log';
  readonly text: string;
}

const format = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

/**
 * Bottoni per operatore + console. Un click = subscribe al demo; il click successivo fa
 * unsubscribe del precedente (come switchMap), e DestroyRef chiude tutto uscendo dalla pagina.
 */
@Component({
  selector: 'sbu-operator-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlock],
  template: `
    <div class="flex flex-wrap gap-2" role="group" [attr.aria-label]="label()">
      @for (demo of demos(); track demo.name) {
        <button
          type="button"
          class="btn font-mono aria-pressed:bg-secondary"
          [attr.aria-pressed]="selected()?.name === demo.name"
          (click)="run(demo)"
        >
          {{ demo.name }}
        </button>
      }
    </div>
    @if (selected(); as demo) {
      <p class="mt-3 text-sm">{{ demo.description }}</p>
      <sbu-code [code]="demo.code" [label]="'Codice di ' + demo.name" />
      <ol role="log" class="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
        @for (entry of entries(); track entry.id) {
          <li>
            <span class="inline-block w-16 text-muted-foreground">{{ entry.ms }}ms</span>
            <span class="font-semibold">{{ entry.kind }}</span>
            {{ entry.text }}
          </li>
        }
      </ol>
    }
  `,
})
export class OperatorGroupView {
  readonly label = input.required<string>();
  readonly demos = input.required<readonly OperatorDemo[]>();

  protected readonly selected = signal<OperatorDemo | undefined>(undefined);
  protected readonly entries = signal<readonly LogEntry[]>([]);

  private subscription?: Subscription;
  private nextId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  protected run(demo: OperatorDemo): void {
    this.subscription?.unsubscribe();
    this.selected.set(demo);
    this.entries.set([]);
    const start = performance.now();
    const write = (kind: LogEntry['kind'], text = '') =>
      this.entries.update((list) => [...list, { id: this.nextId++, ms: Math.round(performance.now() - start), kind, text }]);

    this.subscription = demo.run((text) => write('log', text)).subscribe({
      next: (value) => write('next', format(value)),
      error: (error: unknown) => write('error', error instanceof Error ? error.message : format(error)),
      complete: () => write('complete'),
    });
  }
}
