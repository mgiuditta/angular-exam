import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PAGE_SIZE } from './tokens';

/** Sovrascrive il default root di PAGE_SIZE solo per sé e i suoi discendenti. */
@Component({
  selector: 'sbu-di-page-size-override',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: PAGE_SIZE, useValue: 50 }],
  template: `<span>inject(PAGE_SIZE) nel figlio con providers: <strong>{{ pageSize }}</strong></span>`,
})
export class PageSizeOverride {
  protected readonly pageSize = inject(PAGE_SIZE);
}
