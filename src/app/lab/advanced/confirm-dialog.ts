import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Dialog creato dinamicamente (vedi advanced.page.ts → openDialog).
 *
 * - `<dialog>` nativo + showModal(): focus trap, Esc, backdrop e ripristino del focus li fa il browser
 *   (niente librerie, a11y corretta gratis).
 * - `<form method="dialog">`: i bottoni chiudono il dialog impostando `returnValue`.
 * - showModal() in afterNextRender: l'elemento deve essere nel document, cosa che nel constructor
 *   di un componente creato con createComponent non è ancora vera.
 */
@Component({
  selector: 'sbu-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="m-auto rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-lg backdrop:bg-overlay/50"
      (close)="closed.emit(dialog.returnValue === 'ok')"
    >
      <h3 [id]="titleId" class="text-lg font-semibold">{{ title() }}</h3>
      <form method="dialog" class="mt-4 flex justify-end gap-2">
        <button class="btn" value="cancel">Annulla</button>
        <button class="btn" value="ok">Conferma</button>
      </form>
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly closed = output<boolean>();

  protected readonly titleId = `dialog-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal?.());
  }
}
