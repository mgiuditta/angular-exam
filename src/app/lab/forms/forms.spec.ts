import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { form, FormField, max, min } from '@angular/forms/signals';
import { firstValueFrom, Observable } from 'rxjs';
import { AccessibleErrorsDemo } from './demos/accessible-errors';
import { errorMessage } from './error-message';
import { focusFirstInvalid } from './focus-first-invalid';
import FormsPage from './forms.page';
import { RatingField } from './rating-field';
import { StarRating } from './star-rating';
import { matchFields, strongPassword, usernameAvailable } from './validators';

@Component({
  imports: [ReactiveFormsModule, StarRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sbu-star-rating [formControl]="rating" label="Voto" />`,
})
class CvaHost {
  readonly rating = new FormControl(2, { nonNullable: true });
}

@Component({
  imports: [FormField, RatingField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sbu-rating-field label="Voto" [formField]="review.rating" />`,
})
class SignalHost {
  readonly model = signal({ rating: 0 });
  readonly review = form(this.model, (path) => {
    min(path.rating, 1);
    max(path.rating, 3);
  });
}

function radios(element: HTMLElement): HTMLInputElement[] {
  return Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
}

function leaveGroup(element: HTMLElement): void {
  element.querySelector('fieldset')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
}

describe('Form', () => {
  describe('validator', () => {
    it('strongPassword ignora il vuoto e conta i tipi di carattere', () => {
      const validator = strongPassword(3);
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl('abc'))).toEqual({ strongPassword: { required: 3, actual: 1 } });
      expect(validator(new FormControl('Abc1'))).toBeNull();
    });

    it('matchFields mette l’errore sul gruppo', () => {
      const group = new FormGroup(
        { password: new FormControl('Segreta1'), confirm: new FormControl('') },
        { validators: matchFields('password', 'confirm') },
      );
      expect(group.errors).toBeNull(); // conferma vuota: se ne occupa required

      group.controls.confirm.setValue('altro');
      expect(group.hasError('fieldsMismatch')).toBe(true);
      expect(group.controls.confirm.errors).toBeNull();

      group.controls.confirm.setValue('Segreta1');
      expect(group.valid).toBe(true);
    });

    it('usernameAvailable segnala gli username già usati', async () => {
      const validate = (value: string) =>
        firstValueFrom(usernameAvailable(0)(new FormControl(value)) as Observable<ValidationErrors | null>);
      expect(await validate(' Admin ')).toEqual({ usernameTaken: { value: ' Admin ' } });
      expect(await validate('ada')).toBeNull();
    });

    it('il validator async lascia il controllo PENDING finché non completa', async () => {
      const control = new FormControl('root', {
        validators: Validators.required,
        asyncValidators: usernameAvailable(0),
      });
      expect(control.pending).toBe(true);
      await new Promise((resolve) => setTimeout(resolve));
      expect(control.hasError('usernameTaken')).toBe(true);
    });

    it('errorMessage traduce il primo errore', () => {
      expect(errorMessage(null)).toBe('');
      expect(errorMessage({ minlength: { requiredLength: 3, actualLength: 1 } })).toBe(
        'Servono almeno 3 caratteri (ora 1).',
      );
      expect(errorMessage(Validators.required(new FormControl('')))).toBe('Campo obbligatorio.');
    });
  });

  it('focusFirstInvalid porta il focus sul primo controllo invalido', () => {
    const root = document.createElement('form');
    for (const name of ['name', 'email']) {
      const input = document.createElement('input');
      input.setAttribute('formcontrolname', name);
      root.append(input);
    }
    document.body.append(root);
    const group = new FormGroup({
      name: new FormControl('Ada', Validators.required),
      email: new FormControl('', Validators.required),
    });

    expect(focusFirstInvalid(group, root)).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('[formcontrolname="email"]'));

    group.controls.email.setValue('ada@example.com');
    expect(focusFirstInvalid(group, root)).toBe(false);
    root.remove();
  });

  it('StarRating (ControlValueAccessor) sincronizza valore, touched e disabled', async () => {
    const fixture = TestBed.createComponent(CvaHost);
    await fixture.whenStable();
    const { rating } = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    expect(radios(element)[1].checked).toBe(true); // writeValue(2)

    radios(element)[3].click();
    await fixture.whenStable();
    expect(rating.value).toBe(4);
    expect(rating.dirty).toBe(true);
    expect(rating.touched).toBe(false);

    leaveGroup(element);
    expect(rating.touched).toBe(true);

    rating.setValue(5);
    rating.disable();
    await fixture.whenStable();
    expect(radios(element)[4].checked).toBe(true);
    expect(element.querySelector('fieldset')!.disabled).toBe(true);
  });

  it('RatingField (FormValueControl) riceve max dallo schema e scrive nel modello', async () => {
    const fixture = TestBed.createComponent(SignalHost);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    expect(radios(element).length).toBe(3);
    expect(host.review.rating().invalid()).toBe(true);

    radios(element)[2].click();
    await fixture.whenStable();
    expect(host.model().rating).toBe(3);
    expect(host.review.rating().valid()).toBe(true);

    leaveGroup(element);
    expect(host.review.rating().touched()).toBe(true);
  });

  it('al submit invalido mostra gli errori e mette il focus sul primo campo', async () => {
    const fixture = TestBed.createComponent(AccessibleErrorsDemo);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    const name = element.querySelector<HTMLInputElement>('#ae-name')!;
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('ae-name-error');
    expect(element.querySelector('#ae-name-error')?.textContent).toContain('Campo obbligatorio');
  });

  it('la pagina si renderizza e regge i click sui bottoni', async () => {
    const fixture = TestBed.createComponent(FormsPage);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toBe('Form');
    expect(element.querySelectorAll('sbu-example').length).toBe(14);

    for (const button of element.querySelectorAll<HTMLButtonElement>('button[type="button"]')) {
      button.click();
    }
    await fixture.whenStable();
    fixture.destroy();
  });
});
