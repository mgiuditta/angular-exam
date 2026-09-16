import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { map } from 'rxjs';
import { isUsernameTaken } from './username-api';

const CHARACTER_CLASSES = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];

/**
 * Validator SINCRONO parametrico (factory che restituisce un `ValidatorFn`).
 * Il valore vuoto è valido: "obbligatorio" è compito di `Validators.required` → validator componibili.
 * Errore = oggetto con chiave (il nome dell'errore) e dettagli utili al messaggio.
 */
export function strongPassword(minClasses = 3): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value !== 'string' || value === '') return null;
    const actual = CHARACTER_CLASSES.filter((re) => re.test(value)).length;
    return actual >= minClasses ? null : { strongPassword: { required: minClasses, actual } };
  };
}

/**
 * Validator di GRUPPO (cross-field): va in `{ validators }` del FormGroup.
 * L'errore finisce sul GRUPPO (`group.errors`), non sul campo conferma.
 */
export function matchFields(field: string, confirm: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const expected: unknown = group.get(field)?.value;
    const actual: unknown = group.get(confirm)?.value;
    return !actual || actual === expected ? null : { fieldsMismatch: { field, confirm } };
  };
}

/**
 * Validator ASINCRONO: restituisce Observable (o Promise) di errori.
 * L'Observable DEVE completare (qui `timer` completa da solo): lo stato resta PENDING finché non completa.
 * Angular fa unsubscribe della verifica precedente a ogni nuovo valore (niente switchMap necessario).
 */
export function usernameAvailable(delayMs = 800): AsyncValidatorFn {
  return (control: AbstractControl) =>
    isUsernameTaken(String(control.value ?? ''), delayMs).pipe(
      map((taken) => (taken ? { usernameTaken: { value: control.value } } : null)),
    );
}
