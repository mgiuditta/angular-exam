import { Pipe, PipeTransform } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

/**
 * Traduce il PRIMO errore di `control.errors` in un messaggio leggibile.
 * Le chiavi dei built-in sono in minuscolo: `minlength`/`maxlength` (non minLength!),
 * `requiredTrue` produce comunque la chiave `required`.
 */
export function errorMessage(errors: ValidationErrors | null | undefined): string {
  const [key, detail] = Object.entries(errors ?? {})[0] ?? [];
  switch (key) {
    case undefined:
      return '';
    case 'required':
      return 'Campo obbligatorio.';
    case 'email':
      return 'Indirizzo email non valido.';
    case 'min':
      return `Il valore minimo è ${detail.min}.`;
    case 'max':
      return `Il valore massimo è ${detail.max}.`;
    case 'minlength':
      return `Servono almeno ${detail.requiredLength} caratteri (ora ${detail.actualLength}).`;
    case 'maxlength':
      return `Massimo ${detail.requiredLength} caratteri (ora ${detail.actualLength}).`;
    case 'pattern':
      return 'Formato non valido: solo lettere minuscole, numeri e _.';
    case 'strongPassword':
      return `Usa almeno ${detail.required} tipi di carattere tra minuscole, maiuscole, numeri e simboli (ora ${detail.actual}).`;
    case 'fieldsMismatch':
      return 'Le password non coincidono.';
    case 'usernameTaken':
      return `"${detail.value}" è già in uso.`;
    default:
      return `Valore non valido (${key}).`;
  }
}

/** Pipe PURA: ricalcola solo quando cambia il riferimento di `errors` (i validator creano oggetti nuovi). */
@Pipe({ name: 'errorMessage' })
export class ErrorMessagePipe implements PipeTransform {
  transform(errors: ValidationErrors | null | undefined): string {
    return errorMessage(errors);
  }
}
