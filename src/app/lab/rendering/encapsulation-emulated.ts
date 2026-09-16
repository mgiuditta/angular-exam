import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * ViewEncapsulation.Emulated (default): il compilatore riscrive i selettori aggiungendo attributi unici
 *   p { … }      →  p[_ngcontent-abc-c1] { … }
 *   :host { … }  →  [_nghost-abc-c1] { … }
 * Gli stili globali (Tailwind) entrano; quelli del componente non escono.
 */
@Component({
  selector: 'sbu-encapsulation-emulated',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 2px solid var(--info);
      border-radius: var(--radius);
      padding: 0.5rem;
    }
    :host-context(.enc-contrast) {
      border-style: dashed;
      border-width: 4px;
    }
    p {
      font-weight: 600;
    }
  `,
  template: `<p class="sbu-enc-text text-sm">Emulated: grassetto locale + classi Tailwind ok</p>`,
})
export class EncapsulationEmulated {}
