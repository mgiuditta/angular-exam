import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FROM_PROVIDERS, FROM_VIEW_PROVIDERS } from './panel-tokens';

/** ESEMPIO 7 — Legge i due token del pannello (optional: dove non sono visibili → null). */
@Component({
  selector: 'sbu-di-token-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="rounded-md border border-border p-2 text-sm">
      <span class="font-medium">{{ label() }}</span>
      <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-4">
        <dt>providers</dt>
        <dd><code>{{ fromProviders ?? 'null' }}</code></dd>
        <dt>viewProviders</dt>
        <dd><code>{{ fromViewProviders ?? 'null' }}</code></dd>
      </dl>
    </div>
  `,
})
export class TokenReader {
  readonly label = input.required<string>();
  protected readonly fromProviders = inject(FROM_PROVIDERS, { optional: true });
  protected readonly fromViewProviders = inject(FROM_VIEW_PROVIDERS, { optional: true });
}
