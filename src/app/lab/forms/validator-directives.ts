import { Directive, effect, input } from '@angular/core';
import {
  AbstractControl,
  AsyncValidator,
  NG_ASYNC_VALIDATORS,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { forbiddenWord, usernameAvailable } from './validators';

/**
 * Validator SINCRONO come direttiva: è così che funzionano `required`, `minlength`, `pattern` nei
 * template-driven. `NG_VALIDATORS` è multi: la direttiva si aggiunge ai validator del controllo
 * su cui è applicata (`ngModel`, `formControlName` o `[formControl]`).
 */
@Directive({
  selector: '[sbuForbiddenWord]',
  providers: [{ provide: NG_VALIDATORS, useExisting: ForbiddenWordValidator, multi: true }],
})
export class ForbiddenWordValidator implements Validator {
  readonly word = input.required<string>({ alias: 'sbuForbiddenWord' });

  private onValidatorChange: () => void = () => {};

  constructor() {
    // se cambia il parametro, il controllo va rivalidato: senza questo l'errore resta "vecchio"
    effect(() => {
      this.word();
      this.onValidatorChange();
    });
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return forbiddenWord(this.word())(control);
  }

  /** Angular passa qui la callback che rilancia la validazione del controllo. */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}

/** Validator ASINCRONO come direttiva: stesso schema, ma con `NG_ASYNC_VALIDATORS`. */
@Directive({
  selector: '[sbuUsernameFree]',
  providers: [{ provide: NG_ASYNC_VALIDATORS, useExisting: UsernameFreeValidator, multi: true }],
})
export class UsernameFreeValidator implements AsyncValidator {
  readonly delayMs = input(400, { alias: 'sbuUsernameFree' });

  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    return usernameAvailable(this.delayMs())(control) as Observable<ValidationErrors | null>;
  }
}
