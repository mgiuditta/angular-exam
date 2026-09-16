import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * ViewEncapsulation.ShadowDom: vero Shadow DOM del browser (attachShadow).
 * - I fogli di stile globali (styles.css, Tailwind) NON entrano: qui `text-sm` non ha effetto.
 * - Entrano le proprietà ereditate e le custom property (`var(--foreground)`).
 * - Sorpresa: Angular COPIA nello shadow root gli stili dei componenti Emulated/None già registrati
 *   → la sottolineatura globale di sbu-encapsulation-none arriva anche qui.
 *   `ViewEncapsulation.ExperimentalIsolatedShadowDom` (v21, sperimentale) non li copia.
 * - `:host-context()` in Shadow DOM nativo non è supportato da tutti i browser: non farci affidamento.
 */
@Component({
  selector: 'sbu-encapsulation-shadow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: `
    :host {
      display: block;
      border: 2px solid var(--success);
      border-radius: var(--radius);
      padding: 0.5rem;
      color: var(--foreground);
    }
    :host-context(.enc-contrast) {
      border-style: dashed;
      border-width: 4px;
    }
    p {
      margin: 0;
      font-size: 0.875rem;
      font-style: italic;
    }
  `,
  template: `<p class="sbu-enc-text text-sm">ShadowDom: niente Tailwind, ma gli stili None entrano</p>`,
})
export class EncapsulationShadow {}
