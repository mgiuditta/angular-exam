import { FormGroup } from '@angular/forms';

/**
 * Sposta il focus sul primo controllo invalido, nell'ordine di dichiarazione del FormGroup
 * (tienilo uguale all'ordine visivo). L'elemento si trova con l'attributo statico `formcontrolname`,
 * che è nel DOM fin dal primo render (a differenza di `aria-invalid` / `.ng-invalid`).
 * Restituisce `true` se ha trovato un controllo invalido.
 */
export function focusFirstInvalid(group: FormGroup, root: HTMLElement): boolean {
  const name = Object.keys(group.controls).find((key) => group.controls[key].invalid);
  if (name === undefined) return false;
  root.querySelector<HTMLElement>(`[formcontrolname="${name}"]`)?.focus();
  return true;
}
