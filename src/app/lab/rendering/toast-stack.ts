import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Toast {
  readonly id: number;
  readonly text: string;
}

/**
 * Animazioni native (v20.2+), senza @angular/animations:
 * - `animate.enter="classe"`: la classe viene aggiunta quando l'elemento entra nel DOM e rimossa a fine animazione.
 * - `animate.leave="classe"`: la classe viene aggiunta prima della rimozione; Angular aspetta
 *   animationend/transitionend dell'animazione più lunga, POI rimuove l'elemento.
 *   Se non c'è nessuna animazione (es. prefers-reduced-motion) rimuove subito.
 * - Forma evento: `(animate.leave)="fn($event)"` → chiamare `$event.animationComplete()` (es. Web Animations API, GSAP).
 *   Timeout di sicurezza: token MAX_ANIMATION_TIMEOUT.
 * - Nei test (TestBed) sono disattivate di default: `animationsEnabled: true` per attivarle.
 */
@Component({
  selector: 'sbu-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    .toast-enter {
      animation: toast-in 250ms ease-out;
    }
    .toast-leave {
      animation: toast-out 250ms ease-in forwards;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(-0.5rem);
      }
    }
    @keyframes toast-out {
      to {
        opacity: 0;
        transform: translateX(1rem);
      }
    }
    /* WCAG 2.3.3: chi chiede meno movimento non vede animazioni; Angular rimuove l'elemento subito. */
    @media (prefers-reduced-motion: reduce) {
      .toast-enter,
      .toast-leave {
        animation: none;
      }
    }
  `,
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="add()">Aggiungi notifica</button>
      <button type="button" class="btn" [disabled]="toasts().length === 0" (click)="removeOldest()">
        Rimuovi la più vecchia
      </button>
    </div>
    <ul class="mt-3 flex flex-col gap-2" aria-live="polite" aria-label="Notifiche">
      @for (toast of toasts(); track toast.id) {
        <li animate.enter="toast-enter" animate.leave="toast-leave" class="rounded-md border border-border bg-card p-2 text-sm">
          {{ toast.text }}
        </li>
      }
    </ul>
  `,
})
export class ToastStack {
  protected readonly toasts = signal<readonly Toast[]>([]);
  private nextId = 1;

  protected add(): void {
    const id = this.nextId++;
    this.toasts.update((toasts) => [...toasts, { id, text: `Notifica #${id}` }]);
  }

  protected removeOldest(): void {
    this.toasts.update((toasts) => toasts.slice(1));
  }
}
