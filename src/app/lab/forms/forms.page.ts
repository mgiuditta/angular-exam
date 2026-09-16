import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CodeBlock, ts } from '../shared/code-block';
import { Example, LabPage } from '../shared/example';
import { AccessibleErrorsDemo } from './demos/accessible-errors';
import { AsyncValidatorDemo } from './demos/async-validator';
import { BuiltinValidatorsDemo } from './demos/builtin-validators';
import { CustomValidatorsDemo } from './demos/custom-validators';
import { CvaRatingDemo } from './demos/cva-rating';
import { FormArrayDemo } from './demos/form-array';
import { FormBuilderDemo } from './demos/form-builder';
import { FormEventsDemo } from './demos/form-events';
import { SignalFormBasicsDemo } from './demos/signal-form-basics';
import { SignalFormControlDemo } from './demos/signal-form-control';
import { SignalFormLogicDemo } from './demos/signal-form-logic';
import { TemplateDrivenDemo } from './demos/template-driven';
import { TypedControlsDemo } from './demos/typed-controls';
import { ValueApiDemo } from './demos/value-api';

const CODE = {
  typed: ts`
    profile = new FormGroup({
      name: new FormControl('Ada', { nonNullable: true }), // FormControl<string>
      nickname: new FormControl('ada'),                    // FormControl<string | null>
    });

    this.profile.value;          // Partial<{ name: string; nickname: string | null }>
    this.profile.getRawValue();  // { name: string; nickname: string | null }
    this.profile.reset();        // name → 'Ada' (valore iniziale), nickname → null

    this.profile.controls.name.setValue(null); // ❌ errore di compilazione
    this.profile.get('name');                  // AbstractControl<string> | null (stringa → meno sicuro)

    // template
    <form [formGroup]="profile">
      <input formControlName="name" />
    </form>
  `,
  valueApi: ts`
    this.address.setValue({ street: 'Corso Italia 10', city: 'Roma', zip: '00100' }); // TUTTE le chiavi
    this.address.setValue({ city: 'Roma' });   // ❌ TS + runtime NG01002 (manca street)
    this.address.patchValue({ city: 'Torino' }); // chiavi parziali ok, quelle ignote ignorate

    zip.disable();                     // emette valueChanges/statusChanges (status = 'DISABLED')
    zip.disable({ emitEvent: false }); // nessuna emissione (utile dentro una subscribe → niente loop)
    zip.enable({ emitEvent: false });

    this.address.value;          // SENZA i controlli disabilitati → tipo Partial<...>
    this.address.getRawValue();  // TUTTI i controlli, tipo completo

    // count delle emissioni
    valueChangesCount = toSignal(this.address.valueChanges.pipe(scan((n) => n + 1, 0)), { initialValue: 0 });
  `,
  builder: ts`
    private readonly fb = inject(NonNullableFormBuilder); // oppure inject(FormBuilder).nonNullable

    settings = this.fb.group({
      theme: this.fb.control<'chiaro' | 'scuro'>('chiaro'),     // FormControl<'chiaro' | 'scuro'>
      fontSize: [14, [Validators.min(10), Validators.max(24)]], // FormControl<number>
      flags: this.fb.record({ beta: false, telemetria: true }), // FormRecord<FormControl<boolean>>
    });

    // con FormBuilder "normale" i controlli sono nullable:
    inject(FormBuilder).group({ name: '' }); // FormGroup<{ name: FormControl<string | null> }>

    // FormRecord: chiavi decise a runtime, stesso tipo per tutte
    this.settings.controls.flags.addControl('darkBeta', this.fb.control(false));
    this.settings.controls.flags.removeControl('beta');

    // template: record iterato con keyvalue, controllo standalone fuori dal form
    <fieldset formGroupName="flags">
      @for (flag of settings.controls.flags.controls | keyvalue; track flag.key) {
        <input type="checkbox" [formControlName]="flag.key" />
      }
    </fieldset>
    <input [formControl]="newFlag" />
  `,
  builtin: ts`
    signup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      age: [18, [Validators.required, Validators.min(18), Validators.max(120)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(12),
                      Validators.pattern(/^[a-z0-9_]+$/)]],
      terms: [false, Validators.requiredTrue],
    });

    username.hasError('minlength');                    // chiavi in minuscolo!
    username.getError('minlength')?.requiredLength;     // { requiredLength, actualLength }
    this.signup.hasError('minlength', 'username');      // con path dal gruppo

    // validator dinamici: stessa REFERENZA di funzione per has/remove
    username.removeValidators(Validators.required);
    username.addValidators(Validators.required);
    username.updateValueAndValidity(); // altrimenti lo stato resta quello vecchio

    // template: errori solo dopo touched
    @let usernameInvalid = username.invalid && username.touched;
    <input formControlName="username" [attr.aria-invalid]="usernameInvalid"
           [attr.aria-describedby]="usernameInvalid ? 'bv-username-error' : null" />
  `,
  custom: ts`
    export function strongPassword(minClasses = 3): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        const value: unknown = control.value;
        if (typeof value !== 'string' || value === '') return null; // il vuoto è compito di required
        const actual = CHARACTER_CLASSES.filter((re) => re.test(value)).length;
        return actual >= minClasses ? null : { strongPassword: { required: minClasses, actual } };
      };
    }

    export function matchFields(field: string, confirm: string): ValidatorFn {
      return (group: AbstractControl): ValidationErrors | null => {
        const expected: unknown = group.get(field)?.value;
        const actual: unknown = group.get(confirm)?.value;
        return !actual || actual === expected ? null : { fieldsMismatch: { field, confirm } };
      };
    }

    passwords = this.fb.group(
      { password: ['', [Validators.required, strongPassword(3)]], confirm: ['', Validators.required] },
      { validators: matchFields('password', 'confirm') }, // validator di GRUPPO
    );

    this.passwords.hasError('fieldsMismatch'); // l'errore è sul gruppo, NON su confirm
  `,
  async: ts`
    export function usernameAvailable(delayMs = 800): AsyncValidatorFn {
      return (control) =>
        isUsernameTaken(String(control.value ?? ''), delayMs).pipe(   // Observable che COMPLETA
          map((taken) => (taken ? { usernameTaken: { value: control.value } } : null)),
        );
    }

    account = new FormGroup({
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(3)],
        asyncValidators: [usernameAvailable()],  // eseguito solo se i sincroni passano
        updateOn: 'blur',                        // valore + validazione solo all'uscita dal campo
      }),
    });

    // zoneless: la fine della verifica (timer) non fa partire il CD → leggo lo status come signal
    status = toSignal(this.account.controls.username.statusChanges, {
      initialValue: this.account.controls.username.status,
    });

    // template
    @if (status() === 'PENDING') { Verifica in corso… }
  `,
  events: ts`
    search = this.fb.group({ query: '', startsWith: false });

    // valueChanges → signal → computed
    filters = toSignal(this.search.valueChanges, { initialValue: this.search.getRawValue() });
    results = computed(() => PRODUCTS.filter((p) => p.includes(this.filters().query ?? '')));

    // v18+: UN Observable per tutti gli eventi del controllo (e dei figli, via source)
    eventLog = toSignal(
      this.search.events.pipe(
        map((event) => {
          if (event instanceof ValueChangeEvent) return \`value \${JSON.stringify(event.value)}\`;
          if (event instanceof StatusChangeEvent) return \`status \${event.status}\`;
          if (event instanceof TouchedChangeEvent) return \`touched \${event.touched}\`;
          if (event instanceof PristineChangeEvent) return \`pristine \${event.pristine}\`;
          if (event instanceof FormSubmittedEvent) return 'submit';  // da (ngSubmit) su [formGroup]
          if (event instanceof FormResetEvent) return 'reset';
          return '';
        }),
        scan((log: readonly string[], line) => [line, ...log].slice(0, 12), []),
      ),
      { initialValue: [] },
    );

    // solo un tipo di evento
    this.search.events.pipe(filter((e) => e instanceof StatusChangeEvent));
  `,
  array: ts`
    order = this.fb.group({
      customer: this.fb.group({ name: ['Ada Lovelace', Validators.required] }),
      items: this.fb.array([this.createItem('Tastiera', 1)]), // FormArray<FormGroup<{ product; qty }>>
    });

    private createItem(product = '', qty = 1) {
      return this.fb.group({ product: [product, Validators.required], qty: [qty, Validators.min(1)] });
    }

    addItem()           { this.order.controls.items.push(this.createItem()); }
    removeItem(i: number) { this.order.controls.items.removeAt(i); }
    // anche: insert(i, c), at(i), clear(), setControl(i, c), length

    // template
    <form [formGroup]="order">
      <fieldset formGroupName="customer"> <input formControlName="name" /> </fieldset>
      <fieldset formArrayName="items">
        @for (item of order.controls.items.controls; track item; let i = $index) {
          <div [formGroupName]="i">
            <input formControlName="product" />
            <input type="number" formControlName="qty" />
            <button type="button" (click)="removeItem(i)">Rimuovi</button>
          </div>
        }
      </fieldset>
    </form>
  `,
  cva: ts`
    @Component({
      selector: 'sbu-star-rating',
      providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }],
      template: \`<sbu-stars [value]="value()" [disabled]="disabled()"
                            (rate)="select($event)" (leave)="onTouched()" />\`,
    })
    export class StarRating implements ControlValueAccessor {
      protected readonly value = signal(0);
      protected readonly disabled = signal(false);
      private onChange: (value: number) => void = () => undefined;
      protected onTouched: () => void = () => undefined;

      writeValue(value: number | null) { this.value.set(value ?? 0); }        // modello → vista
      registerOnChange(fn: (value: number) => void) { this.onChange = fn; }
      registerOnTouched(fn: () => void) { this.onTouched = fn; }
      setDisabledState(disabled: boolean) { this.disabled.set(disabled); }   // opzionale

      protected select(star: number) {
        this.value.set(star);
        this.onChange(star);                                                  // vista → modello
      }
    }

    // uso
    <sbu-star-rating formControlName="rating" label="Voto" />
  `,
  a11y: ts`
    @let email = contact.controls.email;
    @let emailInvalid = email.invalid && email.touched;
    <label for="ae-email">Email <span aria-hidden="true">*</span></label>
    <input id="ae-email" formControlName="email" aria-required="true"
           [attr.aria-invalid]="emailInvalid"
           [attr.aria-describedby]="emailInvalid ? 'ae-email-error' : null" />
    @if (emailInvalid) {
      <p id="ae-email-error">{{ email.errors | errorMessage }}</p>
    }
    <p role="status">{{ result() }}</p>

    send(formElement: HTMLFormElement) {
      if (this.contact.invalid) {
        this.contact.markAllAsTouched();
        // dopo il render aria-describedby è già aggiornato → lo screen reader legge anche l'errore
        afterNextRender(() => focusFirstInvalid(this.contact, formElement), { injector: this.injector });
        return;
      }
      // invio...
    }

    export function focusFirstInvalid(group: FormGroup, root: HTMLElement): boolean {
      const name = Object.keys(group.controls).find((key) => group.controls[key].invalid);
      if (name === undefined) return false;
      root.querySelector<HTMLElement>(\`[formcontrolname="\${name}"]\`)?.focus();
      return true;
    }
  `,
  templateDriven: ts`
    imports: [FormsModule]

    name = signal('');          // [(ngModel)] accetta un WritableSignal
    newsletter = signal(false);

    <form #tdForm="ngForm" (ngSubmit)="send(tdForm)">
      <input name="name" required minlength="2" [(ngModel)]="name" #nameModel="ngModel" />
      @if (nameModel.invalid && nameModel.touched) { {{ nameModel.errors | errorMessage }} }
      <input type="checkbox" name="newsletter" [(ngModel)]="newsletter" />
    </form>
    {{ tdForm.value | json }}

    send(form: NgForm) {
      if (form.invalid) { form.control.markAllAsTouched(); return; }
      form.resetForm({ name: '', newsletter: false });
    }
  `,
  signalBasics: ts`
    import { email, form, FormField, FormRoot, min, minLength, required, validate } from '@angular/forms/signals';

    model = signal<Registration>({ name: '', email: '', age: null, password: '', confirm: '' });

    registration = form(
      this.model,                                         // il modello è la fonte di verità
      (path) => {                                         // schema: regole per path
        required(path.name, { message: 'Il nome è obbligatorio.' });
        email(path.email, { message: 'Indirizzo email non valido.' });
        min(path.age, 18, { message: 'Devi essere maggiorenne.' });
        minLength(path.password, 8);
        validate(path.confirm, ({ value, valueOf }) =>
          value() === valueOf(path.password) ? null : { kind: 'mismatch', message: 'Le password non coincidono.' });
      },
      {
        submission: {
          action: async (field) => {                        // solo se valido
            const ok = await api.save(field().value());
            return ok ? undefined : { fieldTree: field.name, kind: 'server', message: 'Nome già registrato.' };
          },
          onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
        },
      },
    );

    // template
    <form [formRoot]="registration">                      <!-- novalidate + submit() automatici -->
      <input [formField]="registration.email" />
      @for (error of registration.email().errors(); track $index) { {{ error.message }} }
      @if (registration().submitting()) { Invio… }
    </form>

    registration.email().value.set('ada@example.com');  // scrive anche in model()
    registration().reset(EMPTY);                        // touched/dirty = false (+ nuovo valore)
  `,
  signalLogic: ts`
    account = form(this.model, (path) => {
      required(path.username);
      debounce(path.username, 400);
      validateAsync(path.username, {
        params: ({ value }) => value(),                                     // undefined → non esegue
        factory: (username) => rxResource({ params: username, stream: ({ params }) => isUsernameTaken(params) }),
        onSuccess: (taken) => (taken ? { kind: 'taken', message: 'Username già in uso.' } : null),
        onError: () => ({ kind: 'network', message: 'Verifica non riuscita.' }),
      });
      // alternativa HTTP: validateHttp(path.username, { request: ({ value }) => \`/api/check/\${value()}\`, ... })

      hidden(path.company, ({ valueOf }) => valueOf(path.type) !== 'azienda');
      required(path.company);                                  // ignorato mentre è hidden
      disabled(path.frequency, ({ valueOf }) => !valueOf(path.newsletter) && 'Attiva la newsletter.');
      readonly(path.referralCode);
    });

    async onSubmit(event: Event) {
      event.preventDefault();
      await submit(this.account, {
        action: async (field) => { /* salva field().value() */ return undefined; },
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
        ignoreValidators: 'none',                               // blocca anche se pending
      });
    }

    // template
    @if (!account.company().hidden()) { <input [formField]="account.company" /> }
    account.username().pending()   account.frequency().disabledReasons()
  `,
  signalControl: ts`
    @Component({
      selector: 'sbu-rating-field',
      template: \`<sbu-stars [value]="value()" [max]="max() ?? 5" [disabled]="disabled()"
                            (rate)="value.set($event)" (leave)="touched.set(true)" />\`,
    })
    export class RatingField implements FormValueControl<number> {
      readonly value = model(0);                             // obbligatorio
      readonly touched = model(false);                       // opzionali, nomi riservati:
      readonly disabled = input(false);                      // valorizzati da [formField]
      readonly max = input<number | undefined>(undefined);   // ← max(path.rating, ...)
    }

    review = form(signal({ rating: 0 }), (path) => {
      min(path.rating, 1, { message: 'Seleziona almeno una stella.' });
      max(path.rating, () => this.maxStars());               // logica reattiva
      disabled(path.rating, () => this.locked());
    });

    <sbu-rating-field [formField]="review.rating" label="Voto" />
  `,
};

/**
 * Pagina: FORM
 *
 * Checklist certificazione:
 * - Typed forms: `nonNullable` (reset torna al valore iniziale), `FormBuilder` vs `NonNullableFormBuilder`,
 *   `FormRecord` per chiavi dinamiche, `value` (senza disabilitati, Partial) vs `getRawValue()`.
 * - `setValue` (tutte le chiavi) vs `patchValue` (parziale); `{ emitEvent: false }` per non emettere.
 * - Validators built-in (chiavi `minlength`/`maxlength` minuscole), `ValidatorFn` custom, validator di gruppo,
 *   `AsyncValidatorFn` (Observable che completa, stato PENDING), `updateOn: 'blur' | 'submit'`.
 * - Flag: touched/untouched, dirty/pristine, valid/invalid/pending/disabled; `markAllAsTouched`,
 *   `updateValueAndValidity` dopo `addValidators`/`removeValidators`.
 * - Reattività: `valueChanges`/`statusChanges`/`events` → `toSignal`. In ZONELESS i getter dei controlli NON
 *   sono signal: la vista si aggiorna per gli eventi del template, ma NON per timer/async → usa toSignal.
 * - `FormArray` + `@for (…; track control)`; `formGroupName`/`formArrayName`/`formControlName` vs `[formControl]`.
 * - `ControlValueAccessor` + `NG_VALUE_ACCESSOR` per controlli custom.
 * - Accessibilità: label, `aria-invalid`, `aria-describedby`, errori dopo touched/submit, focus sul primo errore.
 * - Template-driven (`ngModel`, `#f="ngForm"`): asincrono, tipi non inferiti, logica nel template.
 * - Signal Forms (SPERIMENTALI, `@angular/forms/signals` v21.2): `form(model, schema, options)`, `[formField]`,
 *   `[formRoot]`, `submit()`, `validate`/`validateAsync`, `hidden`/`disabled`/`readonly`, `FormValueControl`.
 */
@Component({
  selector: 'sbu-forms-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Example,
    LabPage,
    CodeBlock,
    TypedControlsDemo,
    ValueApiDemo,
    FormBuilderDemo,
    BuiltinValidatorsDemo,
    CustomValidatorsDemo,
    AsyncValidatorDemo,
    FormEventsDemo,
    FormArrayDemo,
    CvaRatingDemo,
    AccessibleErrorsDemo,
    TemplateDrivenDemo,
    SignalFormBasicsDemo,
    SignalFormLogicDemo,
    SignalFormControlDemo,
  ],
  template: `
    <sbu-lab-page heading="Form">
      <span intro>
        Reactive forms tipizzati (validazione, eventi, FormArray, controlli custom, accessibilità), confronto con i
        template-driven e i nuovi Signal Forms sperimentali. Ogni demo è un componente OnPush in un'app zoneless.
      </span>

      <sbu-example [n]="1" title="FormControl e FormGroup tipizzati: nonNullable e reset">
        <sbu-typed-controls-demo />
        <sbu-code [code]="code.typed" />
        <p note>
          Il tipo è INFERITO dal valore iniziale. Senza <code>nonNullable</code> il tipo include <code>null</code>
          perché <code>reset()</code> porta il valore a <code>null</code>; con <code>nonNullable</code> torna al
          valore iniziale (<code>defaultValue</code>). <code>form.value</code> è <code>Partial</code> (i controlli
          disabilitati spariscono). Per i form legacy esistono <code>UntypedFormGroup</code>/<code>UntypedFormControl</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="2" title="setValue vs patchValue, value vs getRawValue, disable">
        <sbu-value-api-demo />
        <sbu-code [code]="code.valueApi" />
        <p note>
          <code>setValue</code> su un gruppo vuole TUTTE le chiavi (errore NG01002 se ne manca una),
          <code>patchValue</code> no. Disabilitare un controllo lo toglie da <code>value</code> e dalla validazione del
          padre. <code>&#123; emitEvent: false &#125;</code> non emette <code>valueChanges</code>/<code>statusChanges</code>:
          il contatore non cambia. Non usare <code>[disabled]</code> nel template con i reactive forms: usa
          <code>disable()</code>/<code>enable()</code> o <code>new FormControl(&#123; value, disabled: true &#125;)</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="3" title="NonNullableFormBuilder, FormRecord e [formControl]" level="intermedio">
        <sbu-form-builder-demo />
        <sbu-code [code]="code.builder" />
        <p note>
          <code>inject(NonNullableFormBuilder)</code> = <code>inject(FormBuilder).nonNullable</code>: la sintassi
          <code>[valore, validator, asyncValidator]</code> crea controlli non-null. <code>FormGroup</code> ha chiavi fisse
          (<code>addControl</code> con chiave ignota è un errore di tipo); <code>FormRecord</code> ha chiavi dinamiche
          dello stesso tipo. <code>[formControl]</code> lega un controllo standalone, senza <code>[formGroup]</code>
          padre; <code>formControlName</code> cerca per nome nel contenitore più vicino.
        </p>
      </sbu-example>

      <sbu-example [n]="4" title="Validators built-in e flag di stato">
        <sbu-builtin-validators-demo />
        <sbu-code [code]="code.builtin" />
        <p note>
          <code>touched</code> = il campo ha perso il focus; <code>dirty</code> = l'utente ha cambiato il valore
          (<code>setValue</code> da codice NON rende dirty). <code>valid</code> e <code>invalid</code> sono entrambi
          <code>false</code> se lo stato è <code>PENDING</code> o <code>DISABLED</code>. <code>Validators.email</code>
          accetta <code>a&#64;b</code> (niente dominio di primo livello): se serve, aggiungi un <code>pattern</code>.
          Nel template <code>minLength(3)</code> produce la chiave <code>minlength</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="5" title="ValidatorFn custom e validator di gruppo (conferma password)" level="intermedio">
        <sbu-custom-validators-demo />
        <sbu-code [code]="code.custom" />
        <p note>
          Un <code>ValidatorFn</code> è una funzione pura <code>(control) =&gt; ValidationErrors | null</code>; la factory
          permette i parametri. Il validator cross-field sta sul GRUPPO: viene rieseguito quando cambia un qualsiasi
          figlio e l'errore è in <code>passwords.errors</code>, quindi va mostrato "a mano" vicino al campo conferma.
          Evita <code>confirm.setErrors()</code> dentro il validator: il prossimo ricalcolo di confirm lo cancella.
        </p>
      </sbu-example>

      <sbu-example [n]="6" title="Validator asincrono, updateOn: 'blur' e stato PENDING" level="avanzato">
        <sbu-async-validator-demo />
        <sbu-code [code]="code.async" />
        <p note>
          I validator async partono solo se quelli sincroni passano; nel frattempo <code>status</code> è
          <code>PENDING</code>. L'Observable deve COMPLETARE (con <code>valueChanges</code> dentro serve
          <code>take(1)</code>/<code>first()</code>). <code>updateOn: 'blur'</code> evita una richiesta per tasto (anche
          <code>'submit'</code>). Zoneless: il timer che chiude la verifica non avvia il change detection, lo fa il signal
          <code>status()</code>: leggendo solo <code>username.pending</code> la vista resterebbe su "in corso".
        </p>
      </sbu-example>

      <sbu-example [n]="7" title="valueChanges → toSignal e l'Observable unificato events" level="avanzato">
        <sbu-form-events-demo />
        <sbu-code [code]="code.events" />
        <p note>
          <code>valueChanges</code> non emette il valore iniziale (serve <code>initialValue</code>) e sul gruppo emette un
          <code>Partial</code>. <code>events</code> (v18+) riunisce <code>ValueChangeEvent</code>,
          <code>StatusChangeEvent</code>, <code>TouchedChangeEvent</code>, <code>PristineChangeEvent</code>,
          <code>FormSubmittedEvent</code> (solo tramite la direttiva <code>[formGroup]</code>/<code>ngForm</code>) e
          <code>FormResetEvent</code>; <code>event.source</code> dice quale controllo l'ha generato. Il touched di un figlio
          arriva al padre solo se cambia anche il touched del padre.
        </p>
      </sbu-example>

      <sbu-example [n]="8" title="FormArray dinamico: formGroupName, formArrayName" level="intermedio">
        <sbu-form-array-demo />
        <sbu-code [code]="code.array" />
        <p note>
          Traccia le righe con l'istanza del controllo (<code>track item</code>), non con <code>$index</code>: rimuovendo
          una riga Angular riusa il DOM giusto (focus e testo non "saltano"). Dentro <code>formArrayName</code> il nome del
          gruppo è l'indice: <code>[formGroupName]="i"</code>. Usa <code>controls.items</code> tipizzato invece di
          <code>get('items') as FormArray</code>. Per svuotare: <code>clear()</code>, non riassegnare l'array.
        </p>
      </sbu-example>

      <sbu-example [n]="9" title="Controllo custom con ControlValueAccessor" level="avanzato">
        <sbu-cva-rating-demo />
        <sbu-code [code]="code.cva" />
        <p note>
          <code>NG_VALUE_ACCESSOR</code> (multi) è ciò che fa trovare il componente a
          <code>formControlName</code>/<code>ngModel</code>; senza: errore NG01203 "No value accessor". Chiama
          <code>onChange</code> SOLO per cambi dell'utente, mai dentro <code>writeValue</code> (renderebbe dirty il form e
          rischia loop). La UI è un gruppo di radio nativi (tastiera gratis) in <code>fieldset</code>/<code>legend</code>.
          Per un SOTTO-FORM (componente con più campi del form padre) non serve un CVA: basta
          <code>viewProviders</code> che riespone il <code>ControlContainer</code> del padre.
        </p>
      </sbu-example>

      <sbu-example [n]="10" title="Errori accessibili e focus sul primo campo invalido" level="intermedio">
        <sbu-accessible-errors-demo />
        <sbu-code [code]="code.a11y" />
        <p note>
          Ogni campo ha una <code>label</code> associata; l'errore è collegato con <code>aria-describedby</code> e il campo
          ha <code>aria-invalid</code>, entrambi solo dopo touched (niente errori urlati al primo caricamento).
          <code>markAllAsTouched()</code> al submit mostra tutti gli errori, poi il focus va al primo campo invalido dopo il
          render (<code>afterNextRender</code>). Non disabilitare il bottone di invio: l'utente non capirebbe perché. I
          reactive forms aggiungono <code>novalidate</code> al form da soli.
        </p>
      </sbu-example>

      <sbu-example [n]="11" title="Template-driven: ngModel e ngForm (confronto)">
        <sbu-template-driven-demo />
        <sbu-code [code]="code.templateDriven" />
        <p note>
          Con <code>FormsModule</code> la direttiva crea i controlli dal template: servono <code>name</code> e
          <code>ngModel</code>, i validator sono attributi (<code>required</code>, <code>minlength</code>). I controlli
          vengono registrati in modo ASINCRONO (microtask): un <code>viewChild(NgForm)</code> nel costruttore o
          <code>ngOnInit</code> non li vede ancora. Perché preferire i reactive: modello tipizzato e inferito, logica
          testabile senza DOM, validazione dinamica e stream di eventi. <code>&#64;if</code> che rimuove un
          <code>ngModel</code> lo rimuove anche dal form.
        </p>
      </sbu-example>

      <sbu-example [n]="12" title="Signal Forms (sperimentale): form(), schema e submit" level="avanzato">
        <sbu-signal-form-basics-demo />
        <sbu-code [code]="code.signalBasics" />
        <p note>
          SPERIMENTALE in Angular 21 (API installata: <code>&#64;angular/forms</code> 21.2.18): i nomi sono cambiati tra
          le release (<code>Control</code> → <code>Field</code> <code>[field]</code> → <code>FormField</code>
          <code>[formField]</code>). Il modello è un <code>signal</code> (unica fonte di verità, niente copia);
          <code>form()</code> restituisce un <code>FieldTree</code>: <code>registration.email</code> è il campo,
          <code>registration.email()</code> il suo stato (signal <code>value</code>, <code>touched</code>,
          <code>dirty</code>, <code>valid</code>, <code>invalid</code>, <code>errors</code>). Tutto è signal: niente
          toSignal, la vista si aggiorna da sola anche in zoneless. <code>submit()</code> marca tutto touched; gli errori
          restituiti da <code>action</code> diventano errori dei campi. Prova il nome "errore".
        </p>
      </sbu-example>

      <sbu-example [n]="13" title="Signal Forms: validateAsync, hidden, disabled, readonly" level="avanzato">
        <sbu-signal-form-logic-demo />
        <sbu-code [code]="code.signalLogic" />
        <p note>
          <code>validateAsync</code> usa una resource (<code>resource</code>/<code>rxResource</code>): cambiare valore
          annulla la verifica precedente; parte solo se i validator sincroni passano. <code>valid()</code> è
          <code>false</code> durante pending, ma anche <code>invalid()</code> lo è: non sono complementari.
          <code>submit()</code> di default (<code>ignoreValidators: 'pending'</code>) invia anche con verifiche in corso.
          <code>hidden</code> non tocca il DOM (serve <code>&#64;if</code>); campi hidden, disabled e readonly non
          contano per la validità del padre. <code>disabled</code> può restituire una stringa → <code>disabledReasons()</code>.
        </p>
      </sbu-example>

      <sbu-example [n]="14" title="Signal Forms: controllo custom FormValueControl" level="avanzato">
        <sbu-signal-form-control-demo />
        <sbu-code [code]="code.signalControl" />
        <p note>
          Nessun provider né callback: basta <code>value = model()</code>. Gli altri membri con nomi riservati
          (<code>touched</code>, <code>disabled</code>, <code>invalid</code>, <code>errors</code>, <code>required</code>,
          <code>min</code>/<code>max</code>, …) vengono sincronizzati dalla direttiva <code>[formField]</code>: il numero di
          stelle arriva da <code>max()</code> nello schema. Per un booleano c'è <code>FormCheckboxControl</code>
          (<code>checked = model()</code>). <code>[formField]</code> accetta anche componenti con
          <code>ControlValueAccessor</code>, solo per compatibilità.
        </p>
      </sbu-example>
    </sbu-lab-page>
  `,
})
export default class FormsPage {
  protected readonly code = CODE;
}
