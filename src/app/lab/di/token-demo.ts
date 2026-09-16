import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageSizeOverride } from './page-size-override';
import { API_BASE_URL, DOCUMENT_LANG, PAGE_SIZE } from './tokens';

/** ESEMPIO 6 — Lettura dei token: default da factory, override locale, token assente. */
@Component({
  selector: 'sbu-di-token-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageSizeOverride],
  template: `
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>inject(API_BASE_URL, {{ '{' }} optional: true {{ '}' }})</dt>
      <dd><code>{{ apiBaseUrl ?? 'null' }}</code></dd>
      <dt>inject(PAGE_SIZE) (factory root)</dt>
      <dd><strong>{{ pageSize }}</strong></dd>
      <dt>inject(DOCUMENT_LANG) (factory con inject)</dt>
      <dd><code>{{ lang }}</code></dd>
    </dl>
    <p class="mt-2 text-sm"><sbu-di-page-size-override /></p>
  `,
})
export class TokenDemo {
  protected readonly apiBaseUrl = inject(API_BASE_URL, { optional: true });
  protected readonly pageSize = inject(PAGE_SIZE);
  protected readonly lang = inject(DOCUMENT_LANG);
}
