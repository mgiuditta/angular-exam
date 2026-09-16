import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConfirmLeave } from './unsaved-changes.guard';

let nextId = 0;

/**
 * Form protetto da `unsavedChangesGuard` (CanDeactivateFn).
 *
 * Invece di `window.confirm` (bloccante, non stilizzabile, scomodo da testare) la conferma è in pagina:
 * `confirmLeave` restituisce una Promise che la guard passa al router, risolta dai bottoni.
 * Focus management: all'apertura il focus va su "Resta"; se resti, torna all'elemento che aveva
 * avviato la navigazione.
 */
@Component({
  selector: 'sbu-draft-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <h3 class="text-base font-semibold">Editor bozza</h3>
    <form [formGroup]="form" class="mt-2 flex flex-wrap items-end gap-2" (ngSubmit)="save()">
      <label class="flex flex-col gap-1 text-sm">
        Titolo
        <input class="field" formControlName="title" />
      </label>
      <button type="submit" class="btn">Salva</button>
      <p role="status" class="text-sm">{{ form.dirty ? 'Modifiche non salvate' : 'Nessuna modifica in sospeso' }}</p>
    </form>

    @if (pendingTarget(); as target) {
      <div
        role="alertdialog"
        [attr.aria-labelledby]="headingId"
        [attr.aria-describedby]="descriptionId"
        class="mt-3 rounded-lg border border-destructive p-3"
      >
        <p [id]="headingId" class="font-semibold">Uscire senza salvare?</p>
        <p [id]="descriptionId" class="text-sm">
          Stai navigando verso <code>{{ target }}</code>: le modifiche andranno perse.
        </p>
        <div class="mt-2 flex gap-2">
          <button #stayButton type="button" class="btn" (click)="decide(false)">Resta</button>
          <button type="button" class="btn" (click)="decide(true)">Esci senza salvare</button>
        </div>
      </div>
    }
  `,
})
export class DraftEditor implements ConfirmLeave {
  protected readonly form = new FormGroup({ title: new FormControl('', { nonNullable: true }) });
  protected readonly pendingTarget = signal<string | null>(null);
  protected readonly headingId = `leave-heading-${nextId}`;
  protected readonly descriptionId = `leave-description-${nextId++}`;

  private readonly document = inject(DOCUMENT);
  private readonly stayButton = viewChild<ElementRef<HTMLButtonElement>>('stayButton');
  private resolveLeave: ((leave: boolean) => void) | null = null;
  private returnFocus: HTMLElement | null = null;

  constructor() {
    // dopo il render: il bottone esiste nel DOM solo quando pendingTarget non è null
    afterRenderEffect(() => this.stayButton()?.nativeElement.focus());
  }

  confirmLeave(targetUrl: string): boolean | Promise<boolean> {
    if (!this.form.dirty) return true;
    // una nuova navigazione sostituisce quella in attesa: chiudiamo la Promise precedente
    this.resolveLeave?.(false);
    const active = this.document.activeElement;
    this.returnFocus = active instanceof HTMLElement ? active : null;
    this.pendingTarget.set(targetUrl);
    return new Promise((resolve) => (this.resolveLeave = resolve));
  }

  protected decide(leave: boolean): void {
    this.resolveLeave?.(leave);
    this.resolveLeave = null;
    this.pendingTarget.set(null);
    if (!leave) this.returnFocus?.focus();
  }

  protected save(): void {
    this.form.markAsPristine();
  }
}
