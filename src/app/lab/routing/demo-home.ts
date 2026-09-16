import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Figlio con `path: ''` + `pathMatch: 'full'`: visibile solo su /routing esatto. */
@Component({
  selector: 'sbu-demo-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="text-sm">
      Nessuna demo attiva. Usa i link degli esempi: il componente della rotta figlia viene renderizzato qui.
    </p>
  `,
})
export class DemoHome {}
